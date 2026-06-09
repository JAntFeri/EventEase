const std = @import("std");
const httpz = @import("httpz");
const App = @import("main.zig").App;

// ----------------------------------------------------------------------------
// UUID helpers (all string-based, no raw bytes)
// ----------------------------------------------------------------------------

fn uuidV4Hex(arena: std.mem.Allocator, rng: std.Random) ![]const u8 {
    var bytes: [16]u8 = undefined;
    rng.bytes(&bytes);
    bytes[6] = (bytes[6] & 0x0F) | 0x40;
    bytes[8] = (bytes[8] & 0x3F) | 0x80;
    const hex_chars = "0123456789abcdef";
    var buf: [36]u8 = undefined;
    var j: usize = 0;
    for (0..16) |i| {
        if (i == 4 or i == 6 or i == 8 or i == 10) {
            buf[j] = '-';
            j += 1;
        }
        buf[j] = hex_chars[bytes[i] >> 4];
        j += 1;
        buf[j] = hex_chars[bytes[i] & 0x0F];
        j += 1;
    }
    return arena.dupe(u8, &buf);
}

fn jsonParse(comptime T: type, arena: std.mem.Allocator, body: []const u8) !T {
    return std.json.parseFromSliceLeaky(T, arena, body, .{ .ignore_unknown_fields = true });
}

// ----------------------------------------------------------------------------
// Email helpers
// ----------------------------------------------------------------------------

fn emailsEnabled() bool {
    const val = std.c.getenv("DISABLE_EMAILS") orelse return true;
    const slice = std.mem.span(val);
    return slice.len == 0 or std.mem.eql(u8, slice, "0") or std.mem.eql(u8, slice, "false");
}

fn sendEmail(alloc: std.mem.Allocator, io: std.Io, rng: std.Random, to: []const u8, subject: []const u8, body: []const u8) !void {
    const content = try std.fmt.allocPrint(alloc,
        \\From: poll@yourserver.com
        \\To: {s}
        \\Subject: {s}
        \\
        \\{s}
    , .{ to, subject, body });
    defer alloc.free(content);

    var rand_bytes: [8]u8 = undefined;
    rng.bytes(&rand_bytes);
    const unique = std.fmt.bytesToHex(rand_bytes, .lower);
    const filename = try std.fmt.allocPrint(alloc, "/tmp/email_{s}.tmp", .{unique});
    defer alloc.free(filename);

    const file = try std.Io.Dir.cwd().createFile(io, filename, .{ .read = true, .truncate = true });
    defer file.close(io);
    defer std.Io.Dir.cwd().deleteFile(io, filename) catch {};

    var buf: [4096]u8 = undefined;
    var fw = file.writer(io, &buf);
    var writer = &fw.interface;
    try writer.writeAll(content);
    try writer.flush();
    try file.sync(io);

    const cmd = try std.fmt.allocPrint(alloc, "msmtp --file=/etc/msmtprc --timeout=5 -t < '{s}'", .{filename});
    defer alloc.free(cmd);

    const result = try std.process.run(alloc, io, .{
        .argv = &[_][]const u8{ "sh", "-c", cmd },
    });
    defer alloc.free(result.stdout);
    defer alloc.free(result.stderr);

    if (result.term != .exited or result.term.exited != 0) {
        std.log.err("msmtp failed: {s}", .{result.stderr});

        // --- ADD THIS LINE ---
        return error.MsmtpFailed;
    }
}
fn sendEmailWithIcs(
    alloc: std.mem.Allocator,
    io: std.Io,
    rng: std.Random,
    to: []const u8,
    subject: []const u8,
    body: []const u8,
    ics_content: ?[]const u8,
) !void {
    // Build boundary and content first
    var rand_bytes: [8]u8 = undefined;
    rng.bytes(&rand_bytes);
    const boundary = std.fmt.bytesToHex(rand_bytes, .lower);

    const content = if (ics_content) |ics| blk: {
        const encoded_len = std.base64.standard.Encoder.calcSize(ics.len);
        const encoded = try alloc.alloc(u8, encoded_len);
        defer alloc.free(encoded);
        _ = std.base64.standard.Encoder.encode(encoded, ics);

        break :blk try std.fmt.allocPrint(alloc,
            \\From: poll@yourserver.com
            \\To: {s}
            \\Subject: {s}
            \\MIME-Version: 1.0
            \\Content-Type: multipart/mixed; boundary="{s}"
            \\
            \\--{s}
            \\Content-Type: text/plain; charset=utf-8
            \\
            \\{s}
            \\
            \\--{s}
            \\Content-Type: text/calendar; charset=utf-8; method=REQUEST; name="event.ics"
            \\Content-Disposition: attachment; filename="event.ics"
            \\Content-Transfer-Encoding: base64
            \\
            \\{s}
            \\--{s}--
        , .{ to, subject, boundary, boundary, body, boundary, encoded, boundary });
    } else try std.fmt.allocPrint(alloc,
        \\From: poll@yourserver.com
        \\To: {s}
        \\Subject: {s}
        \\
        \\{s}
    , .{ to, subject, body });
    defer alloc.free(content);

    // Generate a unique temp filename
    var file_rand_bytes: [8]u8 = undefined;
    rng.bytes(&file_rand_bytes);
    const unique = std.fmt.bytesToHex(file_rand_bytes, .lower);
    const filename = try std.fmt.allocPrint(alloc, "/tmp/email_{s}.tmp", .{unique});
    defer alloc.free(filename);

    // Write content to temp file
    const file = try std.Io.Dir.cwd().createFile(io, filename, .{ .read = true, .truncate = true });
    defer file.close(io);
    defer std.Io.Dir.cwd().deleteFile(io, filename) catch {};

    var buf: [4096]u8 = undefined;
    var fw = file.writer(io, &buf);
    var writer = &fw.interface;
    try writer.writeAll(content);
    try writer.flush();
    try file.sync(io);

    // Send via msmtp
    const cmd = try std.fmt.allocPrint(alloc, "msmtp --file=/etc/msmtprc --timeout=5 -t < '{s}'", .{filename});
    defer alloc.free(cmd);

    const result = try std.process.run(alloc, io, .{
        .argv = &[_][]const u8{ "sh", "-c", cmd },
    });
    defer alloc.free(result.stdout);
    defer alloc.free(result.stderr);

    if (result.term != .exited or result.term.exited != 0) {
        std.log.err("msmtp failed: {s}", .{result.stderr});
        return error.MsmtpFailed;
    }
}
fn sendVoteNotification(alloc: std.mem.Allocator, io: std.Io, rng: std.Random, organizer_email: []const u8, poll_title: []const u8, participant_name: []const u8) !void {
    const subject = try std.fmt.allocPrint(alloc, "New vote in poll: {s}", .{poll_title});
    defer alloc.free(subject);
    const body = try std.fmt.allocPrint(alloc,
        \\A new vote has been submitted for your poll "{s}".
        \\
        \\Participant: {s}
        \\
        \\Log in to see the updated results.
    , .{ poll_title, participant_name });
    defer alloc.free(body);
    try sendEmail(alloc, io, rng, organizer_email, subject, body);
}

fn sendFinalizationEmail(alloc: std.mem.Allocator, io: std.Io, rng: std.Random, organizer_email: []const u8, poll_title: []const u8, final_slot_start: []const u8, final_slot_end: []const u8, participant_names: []const []const u8) !void {
    const subject = try std.fmt.allocPrint(alloc, "Poll finalized: {s}", .{poll_title});
    defer alloc.free(subject);

    var participants_list = std.ArrayListUnmanaged(u8){ .items = &.{}, .capacity = 0 };
    defer participants_list.deinit(alloc);
    for (participant_names) |name| {
        try participants_list.appendSlice(alloc, "- ");
        try participants_list.appendSlice(alloc, name);
        try participants_list.appendSlice(alloc, "\n");
    }
    const participants_str = try participants_list.toOwnedSlice(alloc);
    defer alloc.free(participants_str);

    const body = try std.fmt.allocPrint(alloc,
        \\Your poll "{s}" has been finalized.
        \\
        \\Final chosen time slot: {s} - {s}
        \\
        \\Participants who voted:
        \\{s}
        \\
        \\You can now view the results.
    , .{ poll_title, final_slot_start, final_slot_end, participants_str });
    defer alloc.free(body);
    try sendEmail(alloc, io, rng, organizer_email, subject, body);
}

fn sendParticipantFinalizationEmail(
    alloc: std.mem.Allocator,
    io: std.Io,
    rng: std.Random,
    participant_email: []const u8,
    participant_name: []const u8,
    poll_title: []const u8,
    final_slot_start: []const u8,
    final_slot_end: []const u8,
) !void {
    const subject = try std.fmt.allocPrint(alloc, "Poll finalized: {s}", .{poll_title});
    defer alloc.free(subject);

    const body = try std.fmt.allocPrint(alloc,
        \\Hello {s},
        \\
        \\The poll "{s}" has been finalized.
        \\The chosen time slot is: {s} - {s}
        \\
        \\An .ics calendar file is attached — open it to add this event to your calendar.
        \\
        \\Thank you for participating.
    , .{ participant_name, poll_title, final_slot_start, final_slot_end });
    defer alloc.free(body);

    const ics = try buildIcsContent(alloc, rng, poll_title, final_slot_start, final_slot_end);
    defer alloc.free(ics);

    try sendEmailWithIcs(alloc, io, rng, participant_email, subject, body, ics);
}

// ----------------------------------------------------------------------------
// Shared types
// ----------------------------------------------------------------------------

const Slot = struct { id: []const u8, start_time: []const u8, end_time: []const u8 };
const VoteOption = struct { slot_id: []const u8, status: []const u8 };
const VoteRecord = struct {
    participant_name: []const u8,
    participant_email: []const u8,
    date_votes: []const VoteOption,
};
const RawVote = struct { id: []const u8, name: []const u8, email: []const u8 };

// ----------------------------------------------------------------------------
// Route handlers
// ----------------------------------------------------------------------------

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

    const poll_id_str = try uuidV4Hex(res.arena, app.rng);
    const admin_token_str = try uuidV4Hex(res.arena, app.rng);
    const share_token_str = try uuidV4Hex(res.arena, app.rng);

    _ = try app.db.exec(
        \\ INSERT INTO polls (id, title, description, organizer_email, admin_token, share_token)
        \\ VALUES ($1, $2, $3, $4, $5, $6)
    , .{ poll_id_str, input.title, input.description, input.organizer_email, admin_token_str, share_token_str });

    for (input.time_slots) |slot| {
        const slot_id_str = try uuidV4Hex(res.arena, app.rng);
        _ = try app.db.exec(
            \\ INSERT INTO time_slots (id, poll_id, start_time, end_time)
            \\ VALUES ($1, $2, $3, $4)
        , .{ slot_id_str, poll_id_str, slot.start_time, slot.end_time });
    }

    res.status = 201;
    try res.json(.{
        .id = poll_id_str,
        .share_token = share_token_str,
        .admin_token = admin_token_str,
    }, .{});
}

pub fn getPoll(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const share_token_hex = req.param("share_token") orelse {
        res.status = 400;
        return;
    };

    var conn = try app.db.acquire();
    defer app.db.release(conn);

    // ----- Poll row -----
    const poll_id_str, const title, const description, const organizer_email, const is_finalized, const final_slot_id_str = blk: {
        var row = conn.row(
            \\ SELECT id::text, title, description, organizer_email, is_finalized, final_slot_id::text
            \\ FROM polls WHERE share_token = $1
        , .{share_token_hex}) catch |err| {
            if (conn.err) |pg_err| std.log.err("getPoll [polls SELECT] PG error: {s}", .{pg_err.message});
            return err;
        } orelse {
            res.status = 404;
            res.body = "Poll not found";
            return;
        };
        defer row.deinit() catch {};
        const id_str = try res.arena.dupe(u8, try row.get([]const u8, 0));
        const t = try res.arena.dupe(u8, try row.get([]const u8, 1));
        const d = try res.arena.dupe(u8, try row.get([]const u8, 2));
        const oe = try res.arena.dupe(u8, try row.get([]const u8, 3));
        const fin = try row.get(bool, 4);
        const fs_raw = try row.get(?[]const u8, 5);
        const fs = if (fs_raw) |r| try res.arena.dupe(u8, r) else null;
        break :blk .{ id_str, t, d, oe, fin, fs };
    };

    // ----- Time slots -----
    const slots = blk: {
        var result = conn.query(
            \\ SELECT id::text, start_time::text, end_time::text
            \\ FROM time_slots WHERE poll_id = $1 ORDER BY start_time
        , .{poll_id_str}) catch |err| {
            if (conn.err) |pg_err| std.log.err("getPoll [time_slots] PG error: {s}", .{pg_err.message});
            return err;
        };
        defer result.deinit();
        var list = std.ArrayListUnmanaged(Slot){ .items = &.{}, .capacity = 0 };
        defer list.deinit(res.arena);
        while (try result.next()) |row| {
            try list.append(res.arena, .{
                .id = try res.arena.dupe(u8, try row.get([]const u8, 0)),
                .start_time = try res.arena.dupe(u8, try row.get([]const u8, 1)),
                .end_time = try res.arena.dupe(u8, try row.get([]const u8, 2)),
            });
        }
        break :blk try list.toOwnedSlice(res.arena);
    };

    // ----- Votes: collect all first, then query options -----
    const votes = blk: {
        var votes_result = conn.query(
            \\ SELECT id::text, participant_name, participant_email
            \\ FROM votes WHERE poll_id = $1 ORDER BY created_at
        , .{poll_id_str}) catch |err| {
            if (conn.err) |pg_err| std.log.err("getPoll [votes] PG error: {s}", .{pg_err.message});
            return err;
        };

        var raw_votes = std.ArrayListUnmanaged(RawVote){ .items = &.{}, .capacity = 0 };
        defer raw_votes.deinit(res.arena);
        while (try votes_result.next()) |vote_row| {
            try raw_votes.append(res.arena, .{
                .id = try res.arena.dupe(u8, try vote_row.get([]const u8, 0)),
                .name = try res.arena.dupe(u8, try vote_row.get([]const u8, 1)),
                .email = try res.arena.dupe(u8, try vote_row.get([]const u8, 2)),
            });
        }
        votes_result.deinit(); // explicit — free connection before nested queries

        var votes_list = std.ArrayListUnmanaged(VoteRecord){ .items = &.{}, .capacity = 0 };
        defer votes_list.deinit(res.arena);
        for (raw_votes.items) |raw_vote| {
            var options_result = conn.query(
                \\ SELECT time_slot_id::text, status
                \\ FROM vote_options WHERE vote_id = $1 ORDER BY time_slot_id
            , .{raw_vote.id}) catch |err| {
                if (conn.err) |pg_err| std.log.err("getPoll [vote_options] PG error: {s}", .{pg_err.message});
                return err;
            };
            var options_list = std.ArrayListUnmanaged(VoteOption){ .items = &.{}, .capacity = 0 };
            defer options_list.deinit(res.arena);
            while (try options_result.next()) |opt_row| {
                try options_list.append(res.arena, .{
                    .slot_id = try res.arena.dupe(u8, try opt_row.get([]const u8, 0)),
                    .status = try res.arena.dupe(u8, try opt_row.get([]const u8, 1)),
                });
            }
            options_result.deinit();
            try votes_list.append(res.arena, .{
                .participant_name = raw_vote.name,
                .participant_email = raw_vote.email,
                .date_votes = options_list.items,
            });
        }
        break :blk try votes_list.toOwnedSlice(res.arena);
    };

    try res.json(.{
        .id = poll_id_str,
        .title = title,
        .description = description,
        .organizer_email = organizer_email,
        .is_finalized = is_finalized,
        .final_slot_id = final_slot_id_str,
        .time_slots = slots,
        .votes = votes,
    }, .{});
}

pub fn getAdminPoll(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const admin_token_hex = req.param("admin_token") orelse {
        res.status = 400;
        return;
    };

    var conn = try app.db.acquire();
    defer app.db.release(conn);

    // ----- Poll row -----
    const poll_id_str, const title, const description, const organizer_email, const is_finalized, const final_slot_id_str, const share_token_str = blk: {
        var row = conn.row(
            \\ SELECT id::text, title, description, organizer_email, is_finalized, final_slot_id::text, share_token::text
            \\ FROM polls WHERE admin_token = $1
        , .{admin_token_hex}) catch |err| {
            if (conn.err) |pg_err| std.log.err("getAdminPoll [polls SELECT] PG error: {s}", .{pg_err.message});
            return err;
        } orelse {
            res.status = 404;
            res.body = "Poll not found";
            return;
        };
        defer row.deinit() catch {};
        const id = try res.arena.dupe(u8, try row.get([]const u8, 0));
        const t = try res.arena.dupe(u8, try row.get([]const u8, 1));
        const d = try res.arena.dupe(u8, try row.get([]const u8, 2));
        const oe = try res.arena.dupe(u8, try row.get([]const u8, 3));
        const fin = try row.get(bool, 4);
        const fs_raw = try row.get(?[]const u8, 5);
        const fs = if (fs_raw) |r| try res.arena.dupe(u8, r) else null;
        const st = try res.arena.dupe(u8, try row.get([]const u8, 6));
        break :blk .{ id, t, d, oe, fin, fs, st };
    };

    // ----- Time slots -----
    const slots = blk: {
        var result = conn.query(
            \\ SELECT id::text, start_time::text, end_time::text
            \\ FROM time_slots WHERE poll_id = $1 ORDER BY start_time
        , .{poll_id_str}) catch |err| {
            if (conn.err) |pg_err| std.log.err("getAdminPoll [time_slots] PG error: {s}", .{pg_err.message});
            return err;
        };
        defer result.deinit();
        var list = std.ArrayListUnmanaged(Slot){ .items = &.{}, .capacity = 0 };
        defer list.deinit(res.arena);
        while (try result.next()) |row| {
            try list.append(res.arena, .{
                .id = try res.arena.dupe(u8, try row.get([]const u8, 0)),
                .start_time = try res.arena.dupe(u8, try row.get([]const u8, 1)),
                .end_time = try res.arena.dupe(u8, try row.get([]const u8, 2)),
            });
        }
        break :blk try list.toOwnedSlice(res.arena);
    };

    // ----- Votes: collect all first, then query options -----
    const votes = blk: {
        var votes_result = conn.query(
            \\ SELECT id::text, participant_name, participant_email
            \\ FROM votes WHERE poll_id = $1 ORDER BY created_at
        , .{poll_id_str}) catch |err| {
            if (conn.err) |pg_err| std.log.err("getAdminPoll [votes] PG error: {s}", .{pg_err.message});
            return err;
        };

        var raw_votes = std.ArrayListUnmanaged(RawVote){ .items = &.{}, .capacity = 0 };
        defer raw_votes.deinit(res.arena);
        while (try votes_result.next()) |vote_row| {
            try raw_votes.append(res.arena, .{
                .id = try res.arena.dupe(u8, try vote_row.get([]const u8, 0)),
                .name = try res.arena.dupe(u8, try vote_row.get([]const u8, 1)),
                .email = try res.arena.dupe(u8, try vote_row.get([]const u8, 2)),
            });
        }
        votes_result.deinit(); // explicit — free connection before nested queries

        var votes_list = std.ArrayListUnmanaged(VoteRecord){ .items = &.{}, .capacity = 0 };
        defer votes_list.deinit(res.arena);
        for (raw_votes.items) |raw_vote| {
            var options_result = conn.query(
                \\ SELECT time_slot_id::text, status
                \\ FROM vote_options WHERE vote_id = $1 ORDER BY time_slot_id
            , .{raw_vote.id}) catch |err| {
                if (conn.err) |pg_err| std.log.err("getAdminPoll [vote_options] PG error: {s}", .{pg_err.message});
                return err;
            };
            var options_list = std.ArrayListUnmanaged(VoteOption){ .items = &.{}, .capacity = 0 };
            defer options_list.deinit(res.arena);
            while (try options_result.next()) |opt_row| {
                try options_list.append(res.arena, .{
                    .slot_id = try res.arena.dupe(u8, try opt_row.get([]const u8, 0)),
                    .status = try res.arena.dupe(u8, try opt_row.get([]const u8, 1)),
                });
            }
            options_result.deinit();
            try votes_list.append(res.arena, .{
                .participant_name = raw_vote.name,
                .participant_email = raw_vote.email,
                .date_votes = options_list.items,
            });
        }
        break :blk try votes_list.toOwnedSlice(res.arena);
    };

    // ----- Suggestions -----
    const suggestions = blk: {
        var result = conn.query(
            \\ SELECT id::text, suggested_by, start_time::text, end_time::text, status
            \\ FROM slot_suggestions WHERE poll_id = $1 ORDER BY created_at
        , .{poll_id_str}) catch |err| {
            if (conn.err) |pg_err| std.log.err("getAdminPoll [suggestions] PG error: {s}", .{pg_err.message});
            return err;
        };
        defer result.deinit();
        var list = std.ArrayListUnmanaged(struct {
            id: []const u8,
            suggested_by: []const u8,
            start_time: []const u8,
            end_time: []const u8,
            status: []const u8,
        }){ .items = &.{}, .capacity = 0 };
        defer list.deinit(res.arena);
        while (try result.next()) |row| {
            try list.append(res.arena, .{
                .id = try res.arena.dupe(u8, try row.get([]const u8, 0)),
                .suggested_by = try res.arena.dupe(u8, try row.get([]const u8, 1)),
                .start_time = try res.arena.dupe(u8, try row.get([]const u8, 2)),
                .end_time = try res.arena.dupe(u8, try row.get([]const u8, 3)),
                .status = try res.arena.dupe(u8, try row.get([]const u8, 4)),
            });
        }
        break :blk try list.toOwnedSlice(res.arena);
    };

    try res.json(.{
        .id = poll_id_str,
        .title = title,
        .description = description,
        .organizer_email = organizer_email,
        .is_finalized = is_finalized,
        .final_slot_id = final_slot_id_str,
        .share_token = share_token_str,
        .time_slots = slots,
        .votes = votes,
        .suggestions = suggestions,
    }, .{});
}
// funkcije za koledar
fn formatIcsTimestamp(buf: []u8, iso: []const u8) []const u8 {
    // Convert "2024-06-15T14:00:00Z" → "20240615T140000Z"
    var out_i: usize = 0;
    for (iso) |c| {
        if (c == '-' or c == ':') continue;
        buf[out_i] = c;
        out_i += 1;
    }
    return buf[0..out_i];
}

fn buildIcsContent(
    alloc: std.mem.Allocator,
    rng: std.Random,
    poll_title: []const u8,
    start_time: []const u8,
    end_time: []const u8,
) ![]const u8 {
    var uid_bytes: [16]u8 = undefined;
    rng.bytes(&uid_bytes);
    const uid_hex = std.fmt.bytesToHex(uid_bytes, .lower);

    var start_buf: [32]u8 = undefined;
    var end_buf: [32]u8 = undefined;
    const start_ics = formatIcsTimestamp(&start_buf, start_time);
    const end_ics = formatIcsTimestamp(&end_buf, end_time);

    return std.fmt.allocPrint(alloc,
        \\BEGIN:VCALENDAR
        \\VERSION:2.0
        \\PRODID:-//YourApp//Poll//EN
        \\METHOD:REQUEST
        \\BEGIN:VEVENT
        \\UID:{s}@yourserver.com
        \\DTSTART:{s}
        \\DTEND:{s}
        \\SUMMARY:{s}
        \\DESCRIPTION:This event was scheduled via a poll.
        \\END:VEVENT
        \\END:VCALENDAR
    , .{ uid_hex, start_ics, end_ics, poll_title });
}

pub fn shareEmail(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const body = req.body() orelse {
        res.status = 400;
        return;
    };

    const input = try jsonParse(struct {
        share_link: []const u8,
        title: []const u8,
        recipients: []const []const u8,
    }, res.arena, body);

    if (emailsEnabled()) {
        for (input.recipients) |recipient| {
            if (recipient.len == 0) continue;

            const subject = try std.fmt.allocPrint(res.arena, "Vabilo: {s}", .{input.title});
            // Removed explicit arena free defers

            const email_body = try std.fmt.allocPrint(res.arena,
                \\Živijo!
                \\
                \\Vabljeni ste k glasovanju za termin dogodka "{s}".
                \\
                \\Kliknite na spodnjo povezavo, da oddate svoj glas:
                \\{s}
                \\
                \\Hvala!
            , .{ input.title, input.share_link });
            // Removed explicit arena free defers

            sendEmail(res.arena, app.io, app.rng, recipient, subject, email_body) catch |err| {
                std.log.err("shareEmail: failed to send to {s}: {}", .{ recipient, err });
            };
        }
    }
    try res.json(.{ .success = true }, .{});
}
pub fn acceptSuggestion(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const admin_token_hex = req.param("admin_token") orelse {
        res.status = 400;
        return;
    };
    const body = req.body() orelse {
        res.status = 400;
        return;
    };

    const input = try jsonParse(struct {
        suggestion_id: []const u8,
    }, res.arena, body);

    var conn = try app.db.acquire();
    defer app.db.release(conn);

    // Verify admin token and get poll id
    const poll_id_str = blk: {
        var row = (conn.row(
            \\ SELECT id::text FROM polls WHERE admin_token = $1
        , .{admin_token_hex}) catch |err| {
            if (conn.err) |pg_err| std.log.err("acceptSuggestion [poll lookup] PG error: {s}", .{pg_err.message});
            return err;
        }) orelse {
            res.status = 404;
            res.body = "Poll not found";
            return;
        };
        defer row.deinit() catch {};
        break :blk try res.arena.dupe(u8, try row.get([]const u8, 0));
    };

    // Get the suggestion's times
    const start_time, const end_time = blk: {
        var row = (conn.row(
            \\ SELECT start_time::text, end_time::text FROM slot_suggestions
            \\ WHERE id = $1 AND poll_id = $2
        , .{ input.suggestion_id, poll_id_str }) catch |err| {
            if (conn.err) |pg_err| std.log.err("acceptSuggestion [suggestion lookup] PG error: {s}", .{pg_err.message});
            return err;
        }) orelse {
            res.status = 404;
            res.body = "Suggestion not found";
            return;
        };
        defer row.deinit() catch {};
        const s = try res.arena.dupe(u8, try row.get([]const u8, 0));
        const e = try res.arena.dupe(u8, try row.get([]const u8, 1));
        break :blk .{ s, e };
    };

    // Insert as a real time slot
    const slot_id_str = try uuidV4Hex(res.arena, app.rng);
    _ = conn.exec(
        \\ INSERT INTO time_slots (id, poll_id, start_time, end_time)
        \\ VALUES ($1, $2, $3, $4)
    , .{ slot_id_str, poll_id_str, start_time, end_time }) catch |err| {
        if (conn.err) |pg_err| std.log.err("acceptSuggestion [insert slot] PG error: {s}", .{pg_err.message});
        return err;
    };

    // Mark suggestion as accepted
    _ = conn.exec(
        \\ UPDATE slot_suggestions SET status = 'accepted' WHERE id = $1
    , .{input.suggestion_id}) catch |err| {
        if (conn.err) |pg_err| std.log.err("acceptSuggestion [update suggestion] PG error: {s}", .{pg_err.message});
        return err;
    };

    try res.json(.{ .success = true, .slot_id = slot_id_str }, .{});
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
        participant_email: []const u8 = "",
        date_votes: []const struct {
            slot_id: []const u8,
            status: []const u8,
        },
        claimed_tasks: []const []const u8 = &.{},
    }, res.arena, body);

    var conn = try app.db.acquire();
    defer app.db.release(conn);

    const poll_id_str = blk: {
        var row = (conn.row(
            \\ SELECT id::text FROM polls WHERE share_token = $1
        , .{share_token_hex}) catch |err| {
            if (conn.err) |pg_err| std.log.err("submitVote [poll lookup] PG error: {s}", .{pg_err.message});
            return err;
        }) orelse {
            res.status = 404;
            res.body = "Poll not found";
            return;
        };
        defer row.deinit() catch {};
        break :blk try res.arena.dupe(u8, try row.get([]const u8, 0));
    };

    for (input.date_votes) |dv| {
        var slot_row = try conn.row(
            \\ SELECT id FROM time_slots WHERE id = $1 AND poll_id = $2
        , .{ dv.slot_id, poll_id_str });
        if (slot_row) |*r| {
            r.deinit() catch {};
        } else {
            res.status = 400;
            res.body = "One or more time slots do not belong to this poll.";
            return;
        }
    }

    _ = try conn.exec("BEGIN", .{});
    errdefer _ = conn.exec("ROLLBACK", .{}) catch {};

    const existing_vote_row = try conn.row(
        \\ SELECT id::text FROM votes WHERE poll_id = $1 AND participant_name = $2
    , .{ poll_id_str, input.participant_name });

    var vote_id_str: []const u8 = undefined;

    if (existing_vote_row) |row_val| {
        var row = row_val;
        vote_id_str = try res.arena.dupe(u8, try row.get([]const u8, 0));
        row.deinit() catch {};

        _ = conn.exec(
            \\ DELETE FROM vote_options WHERE vote_id = $1
        , .{vote_id_str}) catch |err| {
            if (conn.err) |pg_err| std.log.err("submitVote [delete options] PG error: {s}", .{pg_err.message});
            return err;
        };
        _ = conn.exec(
            \\ UPDATE votes SET updated_at = CURRENT_TIMESTAMP, participant_email = $2 WHERE id = $1
        , .{ vote_id_str, input.participant_email }) catch |err| {
            if (conn.err) |pg_err| std.log.err("submitVote [update vote] PG error: {s}", .{pg_err.message});
            return err;
        };
    } else {
        vote_id_str = try uuidV4Hex(res.arena, app.rng);
        _ = conn.exec(
            \\ INSERT INTO votes (id, poll_id, participant_name, participant_email) VALUES ($1, $2, $3, $4)
        , .{ vote_id_str, poll_id_str, input.participant_name, input.participant_email }) catch |err| {
            if (conn.err) |pg_err| std.log.err("submitVote [insert vote] PG error: {s}", .{pg_err.message});
            return err;
        };
    }

    for (input.date_votes) |dv| {
        const option_id_str = try uuidV4Hex(res.arena, app.rng);
        _ = conn.exec(
            \\ INSERT INTO vote_options (id, vote_id, time_slot_id, status)
            \\ VALUES ($1, $2, $3, $4)
        , .{ option_id_str, vote_id_str, dv.slot_id, dv.status }) catch |err| {
            if (conn.err) |pg_err| std.log.err("submitVote [insert option] PG error: {s}", .{pg_err.message});
            return err;
        };
    }

    _ = try conn.exec("COMMIT", .{});

    // Fetch poll info for email notification
    const organizer_email, const poll_title = blk: {
        var row = (try conn.row(
            \\ SELECT organizer_email, title FROM polls WHERE id = $1
        , .{poll_id_str})) orelse return error.PollNotFound;
        defer row.deinit() catch {};
        const oe = try res.arena.dupe(u8, try row.get([]const u8, 0));
        const pt = try res.arena.dupe(u8, try row.get([]const u8, 1));
        break :blk .{ oe, pt };
    };

    if (emailsEnabled()) {
        sendVoteNotification(res.arena, app.io, app.rng, organizer_email, poll_title, input.participant_name) catch |err| {
            std.log.err("Failed to send vote notification: {}", .{err});
        };
    }

    res.status = 201;
    try res.json(.{ .success = true }, .{});
}

pub fn suggestDate(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const share_token_hex = req.param("share_token") orelse {
        res.status = 400;
        return;
    };
    const body = req.body() orelse {
        res.status = 400;
        return;
    };

    const input = jsonParse(struct {
        suggested_by: []const u8,
        dates: []const []const u8,
    }, res.arena, body) catch |err| {
        std.debug.print("JSON Parsing failed for suggestDate: {}\n", .{err});
        res.status = 400;
        res.body = "Malformed JSON payload";
        return;
    };

    var conn = try app.db.acquire();
    defer app.db.release(conn);

    _ = try conn.exec(
        \\ CREATE TABLE IF NOT EXISTS slot_suggestions (
        \\     id UUID PRIMARY KEY,
        \\     poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
        \\     suggested_by VARCHAR(100) NOT NULL,
        \\     start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        \\     end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        \\     status VARCHAR(20) NOT NULL DEFAULT 'pending',
        \\     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        \\ );
    , .{});

    const poll_id_str = blk: {
        var row = (conn.row(
            \\ SELECT id::text FROM polls WHERE share_token = $1
        , .{share_token_hex}) catch |err| {
            if (conn.err) |pg_err| std.log.err("suggestDate [poll lookup] PG error: {s}", .{pg_err.message});
            return err;
        }) orelse {
            res.status = 404;
            res.body = "Poll not found";
            return;
        };
        defer row.deinit() catch {};
        break :blk try res.arena.dupe(u8, try row.get([]const u8, 0));
    };

    for (input.dates) |date_str| {
        if (date_str.len == 0) continue;
        const id_str = try uuidV4Hex(res.arena, app.rng);

        // If it already has a time component, use it directly
        const start_time = if (std.mem.indexOf(u8, date_str, "T") != null)
            try std.fmt.allocPrint(res.arena, "{s}Z", .{date_str})
        else
            try std.fmt.allocPrint(res.arena, "{s}T00:00:00Z", .{date_str});

        const end_time = start_time; // suggestions don't need a real end time

        _ = conn.exec(
            \\ INSERT INTO slot_suggestions (id, poll_id, suggested_by, start_time, end_time, status)
            \\ VALUES ($1, $2, $3, $4, $5, 'pending')
        , .{ id_str, poll_id_str, input.suggested_by, start_time, end_time }) catch |err| {
            if (conn.err) |pg_err| std.log.err("suggestDate [insert] PG error: {s}", .{pg_err.message});
            return err;
        };
    }

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
        final_slot_id: []const u8,
    }, res.arena, body);

    var conn = try app.db.acquire();
    defer app.db.release(conn);

    const poll_id_str, const already_finalized, const organizer_email, const poll_title = blk: {
        var row = (conn.row(
            \\ SELECT id::text, is_finalized, organizer_email, title
            \\ FROM polls WHERE admin_token = $1
        , .{admin_token_hex}) catch |err| {
            if (conn.err) |pg_err| std.log.err("finalizePoll [poll lookup] PG error: {s}", .{pg_err.message});
            return err;
        }) orelse {
            res.status = 404;
            res.body = "Poll not found";
            return;
        };
        defer row.deinit() catch {};
        const id = try res.arena.dupe(u8, try row.get([]const u8, 0));
        const fin = try row.get(bool, 1);
        const oe = try res.arena.dupe(u8, try row.get([]const u8, 2));
        const pt = try res.arena.dupe(u8, try row.get([]const u8, 3));
        break :blk .{ id, fin, oe, pt };
    };

    if (already_finalized) {
        res.status = 409;
        res.body = "Poll has already been finalized.";
        return;
    }

    _ = try conn.exec(
        \\ UPDATE polls SET is_finalized = TRUE, final_slot_id = $1 WHERE id = $2
    , .{ input.final_slot_id, poll_id_str });

    const final_start, const final_end = blk: {
        var row = (try conn.row(
            \\ SELECT start_time::text, end_time::text FROM time_slots WHERE id = $1
        , .{input.final_slot_id})) orelse {
            res.status = 400;
            res.body = "Final slot not found";
            return;
        };
        defer row.deinit() catch {};
        const s = try res.arena.dupe(u8, try row.get([]const u8, 0));
        const e = try res.arena.dupe(u8, try row.get([]const u8, 1));
        break :blk .{ s, e };
    };

    var participants_result = try conn.query(
        \\ SELECT participant_name, participant_email FROM votes WHERE poll_id = $1
    , .{poll_id_str});

    var participant_names = std.ArrayListUnmanaged([]const u8){ .items = &.{}, .capacity = 0 };
    defer participant_names.deinit(res.arena);
    var participant_emails = std.ArrayListUnmanaged([]const u8){ .items = &.{}, .capacity = 0 };
    defer participant_emails.deinit(res.arena);

    while (try participants_result.next()) |row| {
        try participant_names.append(res.arena, try res.arena.dupe(u8, try row.get([]const u8, 0)));
        try participant_emails.append(res.arena, try res.arena.dupe(u8, try row.get([]const u8, 1)));
    }
    participants_result.deinit();

    if (emailsEnabled()) {
        sendFinalizationEmail(res.arena, app.io, app.rng, organizer_email, poll_title, final_start, final_end, participant_names.items) catch |err| {
            std.log.err("Failed to send finalization email to organizer: {}", .{err});
        };
    }

    for (participant_emails.items, participant_names.items) |email, name| {
        if (email.len == 0) continue; // add this line
        if (emailsEnabled()) {
            sendParticipantFinalizationEmail(res.arena, app.io, app.rng, email, name, poll_title, final_start, final_end) catch |err| {
                std.log.err("Failed to send finalization email to {s}: {}", .{ name, err });
            };
        }
    }

    try res.json(.{ .success = true }, .{});
}
