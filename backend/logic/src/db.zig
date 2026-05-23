const std = @import("std");
const pg = @import("pg");

pub const Pool = pg.Pool;

pub fn initPool(io: std.Io, alloc: std.mem.Allocator, db_url: []const u8) !*Pool {
    const uri = try std.Uri.parse(db_url);
    return try pg.Pool.initUri(io, alloc, uri, .{ .size = 5 });
}

pub fn migrate(pool: *Pool) !void {
    const schema = @embedFile("podatkovna_shema.sql");
    var conn = try pool.acquire();
    defer pool.release(conn);

    _ = conn.exec(schema, .{}) catch |err| {
        if (conn.err) |pg_err| {
            std.log.err("migration error: {s}", .{pg_err.message});
        }
        return err;
    };
}

pub fn rowOne(pool: *Pool, comptime T: type, sql: []const u8, args: anytype) !?T {
    var conn = try pool.acquire();
    defer pool.release(conn);

    var row = try conn.row(sql, args) orelse return null;
    defer row.deinit() catch {};

    var result: T = undefined;
    inline for (std.meta.fields(T), 0..) |field, i| {
        @field(result, field.name) = try row.get(field.type, i);
    }
    return result;
}
