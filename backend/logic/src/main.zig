const std = @import("std");
const httpz = @import("httpz");
const db_mod = @import("db.zig");
const routes = @import("routes.zig");
const static_handler = @import("static.zig");

pub const App = struct {
    db: *db_mod.Pool,
    io: std.Io,
    rng: std.Random,
};

pub fn main(init: std.process.Init) !void {
    const gpa = init.gpa;
    const io = init.io;

    const db_url = init.environ_map.get("DATABASE_URL") orelse {
        std.log.err("DATABASE_URL not set", .{});
        std.process.exit(1);
    };

    var pool = try db_mod.initPool(io, gpa, db_url);
    defer pool.deinit();
    try db_mod.migrate(pool);

    var seed_buf: [8]u8 = undefined;
    io.random(&seed_buf);
    const seed = std.mem.readInt(u64, &seed_buf, .little);
    var prng = std.Random.DefaultPrng.init(seed);
    const rng = prng.random();

    var app = App{ .db = pool, .io = io, .rng = rng };

    var server = try httpz.Server(*App).init(io, gpa, .{
        .address = .all(3000),
    }, &app);
    defer server.deinit();
    defer server.stop();

    var router = try server.router(.{});

    router.post("/api/polls", routes.createPoll, .{});
    router.get("/api/polls/share/:share_token", routes.getPoll, .{});
    router.post("/api/polls/share/:share_token/vote", routes.submitVote, .{});
    router.post("/api/polls/admin/:admin_token/finalize", routes.finalizePoll, .{});
    router.all("/*", static_handler.handle, .{});

    try server.listen();
}
