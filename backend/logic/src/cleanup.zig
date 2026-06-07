const std = @import("std");
const db_mod = @import("db.zig");

pub fn cleanupLoop(pool: *db_mod.Pool, io: std.Io, interval_ms: u64) void {
    const duration = std.Io.Duration.fromMilliseconds(@intCast(interval_ms));

    while (true) {
        std.Io.sleep(io, duration, .awake) catch |err| {
            std.log.err("cleanup sleep failed: {}", .{err});
            return;
        };
        cleanupExpired(pool) catch |err| {
            std.log.err("cleanup error: {}", .{err});
        };
    }
}

fn cleanupExpired(pool: *db_mod.Pool) !void {
    var conn = try pool.acquire();
    defer pool.release(conn);

    _ = try conn.exec(
        \\ DELETE FROM polls
        \\ WHERE is_finalized = TRUE
        \\   AND final_slot_id IS NOT NULL
        \\   AND (
        \\     SELECT end_time FROM time_slots WHERE id = polls.final_slot_id
        \\   ) + INTERVAL '7 days' < CURRENT_TIMESTAMP
    , .{});
}
