const std = @import("std");
const httpz = @import("httpz");
const App = @import("main.zig").App;

fn uuidToHex(raw: []const u8, arena: std.mem.Allocator) ![]const u8 {
    if (raw.len != 16) return error.InvalidUUID;
    const hex_chars = "0123456789abcdef";
    var buf: [36]u8 = undefined;
    var j: usize = 0;
    for (0..16) |i| {
        if (i == 4 or i == 6 or i == 8 or i == 10) {
            buf[j] = '-';
            j += 1;
        }
        buf[j] = hex_chars[raw[i] >> 4];
        j += 1;
        buf[j] = hex_chars[raw[i] & 0x0F];
        j += 1;
    }
    return arena.dupe(u8, &buf);
}

fn hexToUuid(hex: []const u8, arena: std.mem.Allocator) ![]const u8 {
    if (hex.len != 36) return error.InvalidUUID;
    const raw = try arena.alloc(u8, 16);
    var i: usize = 0;
    var j: usize = 0;
    while (i < 36) : (i += 1) {
        const c = hex[i];
        if (c == '-') continue;
        const val = switch (c) {
            '0'...'9' => c - '0',
            'a'...'f' => c - 'a' + 10,
            'A'...'F' => c - 'A' + 10,
            else => return error.InvalidUUID,
        };
        if (j % 2 == 0) {
            raw[j / 2] = @intCast(val << 4);
        } else {
            raw[j / 2] |= @intCast(val);
        }
        j += 1;
    }
    if (j != 32) return error.InvalidUUID;
    return raw;
}

fn uuidV4Raw(arena: std.mem.Allocator, rng: std.Random) ![]const u8 {
    var bytes: [16]u8 = undefined;
    rng.bytes(&bytes);
    bytes[6] = (bytes[6] & 0x0F) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3F) | 0x80; // variant 10xx
    return arena.dupe(u8, &bytes);
}

fn uuidV4Hex(arena: std.mem.Allocator, rng: std.Random) ![]const u8 {
    const raw = try uuidV4Raw(arena, rng);
    return uuidToHex(raw, arena);
}

fn jsonParse(comptime T: type, arena: std.mem.Allocator, body: []const u8) !T {
    return std.json.parseFromSliceLeaky(T, arena, body, .{ .ignore_unknown_fields = true });
}

pub fn createPoll(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const body = req.body() orelse {
        res.status = 400;
        return;
    };

    const input = try jsonParse(struct {
        title: []const u8,
        description: []const u8 = "",
        organizer_email: []const u8,
        time_slots: []const struct {
            start_time: []const u8,
            end_time: []const u8,
        },
        tasks: []const []const u8 = &.{},
    }, res.arena, body);

    const poll_id_raw = try uuidV4Raw(res.arena, app.rng);
    const admin_token_raw = try uuidV4Raw(res.arena, app.rng);
    const share_token_raw = try uuidV4Raw(res.arena, app.rng);

    _ = try app.db.exec(
        \\ INSERT INTO polls (id, title, description, organizer_email, admin_token, share_token)
        \\ VALUES ($1, $2, $3, $4, $5, $6)
    , .{ poll_id_raw, input.title, input.description, input.organizer_email, admin_token_raw, share_token_raw });

    for (input.time_slots) |slot| {
        const slot_id_raw = try uuidV4Raw(res.arena, app.rng);
        _ = try app.db.exec(
            \\ INSERT INTO time_slots (id, poll_id, start_time, end_time)
            \\ VALUES ($1, $2, $3, $4)
        , .{ slot_id_raw, poll_id_raw, slot.start_time, slot.end_time });
    }

    res.status = 201;
    try res.json(.{
        .id = try uuidToHex(poll_id_raw, res.arena),
        .share_token = try uuidToHex(share_token_raw, res.arena),
        .admin_token = try uuidToHex(admin_token_raw, res.arena),
    }, .{});
}

pub fn getPoll(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const share_token_hex = req.param("share_token") orelse {
        res.status = 400;
        return;
    };

    const share_token_raw = try hexToUuid(share_token_hex, res.arena);

    var conn = try app.db.acquire();
    defer app.db.release(conn);

    var poll_row = (try conn.row(
        \\ SELECT id, title, description, organizer_email, is_finalized, final_slot_id
        \\ FROM polls WHERE share_token = $1
    , .{share_token_raw})) orelse {
        res.status = 404;
        res.body = "Poll not found";
        return;
    };

    const poll_id_raw = try res.arena.dupe(u8, try poll_row.get([]const u8, 0));
    const title = try res.arena.dupe(u8, try poll_row.get([]const u8, 1));
    const description = try res.arena.dupe(u8, try poll_row.get([]const u8, 2));
    const organizer_email = try res.arena.dupe(u8, try poll_row.get([]const u8, 3));
    const is_finalized = try poll_row.get(bool, 4);
    const final_slot_id_raw: ?[]const u8 = blk: {
        const raw = try poll_row.get(?[]const u8, 5);
        break :blk if (raw) |r| try res.arena.dupe(u8, r) else null;
    };

    poll_row.deinit() catch {};

    // Fetch time slots
    var slots_result = try conn.query(
        \\ SELECT id, start_time::text, end_time::text
        \\ FROM time_slots WHERE poll_id = $1 ORDER BY start_time
    , .{poll_id_raw});
    defer slots_result.deinit();

    var slots: std.ArrayList(struct {
        id: []const u8,
        start_time: []const u8,
        end_time: []const u8,
    }) = .empty;

    while (try slots_result.next()) |row| {
        const slot_id_raw = try res.arena.dupe(u8, try row.get([]const u8, 0));
        try slots.append(res.arena, .{
            .id = try uuidToHex(slot_id_raw, res.arena),
            .start_time = try res.arena.dupe(u8, try row.get([]const u8, 1)),
            .end_time = try res.arena.dupe(u8, try row.get([]const u8, 2)),
        });
    }

    // Fetch votes with their options
    var votes_result = try conn.query(
        \\ SELECT id, participant_name
        \\ FROM votes WHERE poll_id = $1 ORDER BY created_at
    , .{poll_id_raw});

    const VoteOption = struct {
        slot_id: []const u8,
        status: []const u8,
    };
    const VoteRecord = struct {
        participant_name: []const u8,
        date_votes: []const VoteOption,
    };

    var votes_list: std.ArrayList(VoteRecord) = .empty;

    while (try votes_result.next()) |vote_row| {
        const vote_id_raw = try res.arena.dupe(u8, try vote_row.get([]const u8, 0));
        const participant_name = try res.arena.dupe(u8, try vote_row.get([]const u8, 1));

        var options_result = try conn.query(
            \\ SELECT time_slot_id, status
            \\ FROM vote_options WHERE vote_id = $1 ORDER BY time_slot_id
        , .{vote_id_raw});
        defer options_result.deinit();

        var options_list: std.ArrayList(VoteOption) = .empty;

        while (try options_result.next()) |opt_row| {
            const slot_id_raw = try res.arena.dupe(u8, try opt_row.get([]const u8, 0));
            const status = try res.arena.dupe(u8, try opt_row.get([]const u8, 1));
            try options_list.append(res.arena, .{
                .slot_id = try uuidToHex(slot_id_raw, res.arena),
                .status = status,
            });
        }

        try votes_list.append(res.arena, .{
            .participant_name = participant_name,
            .date_votes = options_list.items,
        });
    }
    votes_result.deinit();

    try res.json(.{
        .id = try uuidToHex(poll_id_raw, res.arena),
        .title = title,
        .description = description,
        .organizer_email = organizer_email,
        .is_finalized = is_finalized,
        .final_slot_id = if (final_slot_id_raw) |raw| try uuidToHex(raw, res.arena) else null,
        .time_slots = slots.items,
        .votes = votes_list.items,
    }, .{});
}

pub fn submitVote(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const share_token_hex = req.param("share_token") orelse {
        res.status = 400;
        return;
    };
    const body = req.body() orelse {
        res.status = 400;
        return;
    };
    const input = try jsonParse(struct {
        participant_name: []const u8,
        date_votes: []const struct {
            slot_id: []const u8, // hex string from the client
            status: []const u8,
        },
        claimed_tasks: []const []const u8 = &.{},
    }, res.arena, body);
    const share_token_raw = try hexToUuid(share_token_hex, res.arena);
    var conn = try app.db.acquire();
    defer app.db.release(conn);

    // Look up the poll
    var poll_row = (try conn.row(
        \\ SELECT id FROM polls WHERE share_token = $1
    , .{share_token_raw})) orelse {
        res.status = 404;
        res.body = "Poll not found";
        return;
    };
    const poll_id_raw = try res.arena.dupe(u8, try poll_row.get([]const u8, 0));
    poll_row.deinit() catch {};

    // Validate that every slot_id belongs to this poll
    for (input.date_votes) |dv| {
        const slot_id_raw = try hexToUuid(dv.slot_id, res.arena);
        const valid = (try conn.row(
            \\ SELECT id FROM time_slots WHERE id = $1 AND poll_id = $2
        , .{ slot_id_raw, poll_id_raw })) != null;
        if (!valid) {
            res.status = 400;
            res.body = "One or more time slots do not belong to this poll.";
            return;
        }
    }

    // Begin transaction
    _ = try conn.exec("BEGIN", .{});
    errdefer _ = conn.exec("ROLLBACK", .{}) catch {};

    // Check if the participant already has a vote for this poll
    const existing_vote_row = try conn.row(
        \\ SELECT id FROM votes WHERE poll_id = $1 AND participant_name = $2
    , .{ poll_id_raw, input.participant_name });

    var vote_id_raw: []const u8 = undefined;

    if (existing_vote_row) |row_val| {
        // Create a mutable copy of the row struct so we can call deinit()
        var row = row_val;

        vote_id_raw = try res.arena.dupe(u8, try row.get([]const u8, 0));
        row.deinit() catch {};

        // 1. Delete old vote options
        _ = conn.exec(
            \\ DELETE FROM vote_options WHERE vote_id = $1
        , .{vote_id_raw}) catch |err| {
            if (conn.err) |pg_err| std.debug.print("delete old vote_options error: {s}\n", .{pg_err.message});
            return err;
        };

        // 2. Update the updated_at attribute of the existing vote
        _ = conn.exec(
            \\ UPDATE votes SET updated_at = CURRENT_TIMESTAMP WHERE id = $1
        , .{vote_id_raw}) catch |err| {
            if (conn.err) |pg_err| std.debug.print("update vote error: {s}\n", .{pg_err.message});
            return err;
        };
    } else {
        vote_id_raw = try uuidV4Raw(res.arena, app.rng);
        _ = conn.exec(
            \\ INSERT INTO votes (id, poll_id, participant_name) VALUES ($1, $2, $3)
        , .{ vote_id_raw, poll_id_raw, input.participant_name }) catch |err| {
            if (conn.err) |pg_err| std.debug.print("vote insert error: {s}\n", .{pg_err.message});
            return err;
        };
    }

    // Insert new vote options
    for (input.date_votes) |dv| {
        const slot_id_raw = try hexToUuid(dv.slot_id, res.arena);
        const option_id_raw = try uuidV4Raw(res.arena, app.rng);
        _ = conn.exec(
            \\ INSERT INTO vote_options (id, vote_id, time_slot_id, status)
            \\ VALUES ($1, $2, $3, $4)
        , .{ option_id_raw, vote_id_raw, slot_id_raw, dv.status }) catch |err| {
            if (conn.err) |pg_err| std.debug.print("vote_option insert error: {s}\n", .{pg_err.message});
            return err;
        };
    }

    _ = try conn.exec("COMMIT", .{});
    res.status = 201;
    try res.json(.{ .success = true }, .{});
}

pub fn finalizePoll(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const admin_token_hex = req.param("admin_token") orelse {
        res.status = 400;
        return;
    };
    const body = req.body() orelse {
        res.status = 400;
        return;
    };

    const input = try jsonParse(struct {
        final_slot_id: []const u8, // hex string from the client
    }, res.arena, body);

    const admin_token_raw = try hexToUuid(admin_token_hex, res.arena);
    const final_slot_id_raw = try hexToUuid(input.final_slot_id, res.arena);

    var conn = try app.db.acquire();
    defer app.db.release(conn);

    var poll_row = (try conn.row(
        \\ SELECT id, is_finalized FROM polls WHERE admin_token = $1
    , .{admin_token_raw})) orelse {
        res.status = 404;
        res.body = "Poll not found";
        return;
    };

    const poll_id_raw = try res.arena.dupe(u8, try poll_row.get([]const u8, 0));
    const already_finalized = try poll_row.get(bool, 1);
    poll_row.deinit() catch {};

    if (already_finalized) {
        res.status = 409;
        res.body = "Poll has already been finalized.";
        return;
    }

    _ = try conn.exec(
        \\ UPDATE polls SET is_finalized = TRUE, final_slot_id = $1 WHERE id = $2
    , .{ final_slot_id_raw, poll_id_raw });

    try res.json(.{ .success = true }, .{});
}
