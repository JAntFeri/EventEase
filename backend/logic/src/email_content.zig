const std = @import("std");

// ----------------------------------------------------------------------------
// iCalendar (.ics)
// ----------------------------------------------------------------------------

pub const IcsError = error{ InvalidTimestamp, InvalidTimeRange };

/// Pretvori časovni žig iz Postgresa ("2024-06-15 14:00:00+02") ali ISO 8601
/// ("2024-06-15T14:00:00Z") v UTC zapis za iCalendar ("20240615T120000Z").
/// Žig brez časovnega pasu obravnavamo kot UTC.
pub fn formatIcsTimestamp(buf: *[16]u8, ts: []const u8) IcsError![]const u8 {
    if (ts.len < 19) return error.InvalidTimestamp;
    if (ts[4] != '-' or ts[7] != '-' or (ts[10] != ' ' and ts[10] != 'T') or ts[13] != ':' or ts[16] != ':')
        return error.InvalidTimestamp;

    const year = try parseDigits(ts[0..4]);
    const month = try parseDigits(ts[5..7]);
    const day = try parseDigits(ts[8..10]);
    const hour = try parseDigits(ts[11..13]);
    const minute = try parseDigits(ts[14..16]);
    const second = try parseDigits(ts[17..19]);
    if (month < 1 or month > 12 or day < 1 or day > daysInMonth(year, month) or
        hour > 23 or minute > 59 or second > 59)
        return error.InvalidTimestamp;

    var rest = ts[19..];
    if (rest.len > 0 and rest[0] == '.') {
        var i: usize = 1;
        while (i < rest.len and std.ascii.isDigit(rest[i])) : (i += 1) {}
        if (i == 1) return error.InvalidTimestamp;
        rest = rest[i..];
    }
    const offset = try parseZoneOffset(rest);

    const utc = daysFromCivil(year, month, day) * 86400 + hour * 3600 + minute * 60 + second - offset;
    const date = civilFromDays(@divFloor(utc, 86400));
    if (date.year < 0 or date.year > 9999) return error.InvalidTimestamp;
    const secs = @mod(utc, 86400);

    return std.fmt.bufPrint(buf, "{d:0>4}{d:0>2}{d:0>2}T{d:0>2}{d:0>2}{d:0>2}Z", .{
        @as(u16, @intCast(date.year)),
        @as(u8, @intCast(date.month)),
        @as(u8, @intCast(date.day)),
        @as(u8, @intCast(@divFloor(secs, 3600))),
        @as(u8, @intCast(@divFloor(@mod(secs, 3600), 60))),
        @as(u8, @intCast(@mod(secs, 60))),
    }) catch error.InvalidTimestamp;
}

/// Ubeži znake v besedilni vrednosti iCalendar (RFC 5545, 3.3.11).
pub fn escapeIcsText(alloc: std.mem.Allocator, text: []const u8) ![]u8 {
    var out = std.ArrayListUnmanaged(u8){ .items = &.{}, .capacity = 0 };
    errdefer out.deinit(alloc);
    for (text) |c| {
        switch (c) {
            '\\' => try out.appendSlice(alloc, "\\\\"),
            ';' => try out.appendSlice(alloc, "\\;"),
            ',' => try out.appendSlice(alloc, "\\,"),
            '\n' => try out.appendSlice(alloc, "\\n"),
            '\r' => {},
            else => try out.append(alloc, c),
        }
    }
    return out.toOwnedSlice(alloc);
}

pub fn buildIcsContent(
    alloc: std.mem.Allocator,
    poll_title: []const u8,
    start_time: []const u8,
    end_time: []const u8,
) ![]const u8 {
    var start_buf: [16]u8 = undefined;
    var end_buf: [16]u8 = undefined;
    const start_ics = try formatIcsTimestamp(&start_buf, start_time);
    const end_ics = try formatIcsTimestamp(&end_buf, end_time);
    // Oba sta v enaki obliki, zato leksikografska primerjava ustreza časovni.
    if (!std.mem.lessThan(u8, start_ics, end_ics)) return error.InvalidTimeRange;

    const summary = try escapeIcsText(alloc, poll_title);
    defer alloc.free(summary);

    return std.fmt.allocPrint(alloc, "BEGIN:VCALENDAR\r\n" ++
        "VERSION:2.0\r\n" ++
        "PRODID:-//EventEase//Poll//EN\r\n" ++
        "METHOD:REQUEST\r\n" ++
        "BEGIN:VEVENT\r\n" ++
        "UID:{s}-{x:0>16}@eventease\r\n" ++
        "DTSTART:{s}\r\n" ++
        "DTEND:{s}\r\n" ++
        "SUMMARY:{s}\r\n" ++
        "DESCRIPTION:This event was scheduled via a poll.\r\n" ++
        "END:VEVENT\r\n" ++
        "END:VCALENDAR\r\n", .{ start_ics, std.hash.Wyhash.hash(0, poll_title), start_ics, end_ics, summary });
}

fn parseDigits(s: []const u8) IcsError!i64 {
    var v: i64 = 0;
    for (s) |c| {
        if (!std.ascii.isDigit(c)) return error.InvalidTimestamp;
        v = v * 10 + (c - '0');
    }
    return v;
}

/// "", "Z", "+HH", "+HH:MM" ali "+HHMM" (tudi z "-") → odmik v sekundah.
fn parseZoneOffset(zone: []const u8) IcsError!i64 {
    if (zone.len == 0) return 0;
    if (zone.len == 1 and zone[0] == 'Z') return 0;
    if (zone[0] != '+' and zone[0] != '-') return error.InvalidTimestamp;
    const sign: i64 = if (zone[0] == '-') -1 else 1;
    const body = zone[1..];
    const minutes_part: []const u8 = switch (body.len) {
        2 => "00",
        4 => body[2..4],
        5 => if (body[2] == ':') body[3..5] else return error.InvalidTimestamp,
        else => return error.InvalidTimestamp,
    };
    const hours = try parseDigits(body[0..2]);
    const minutes = try parseDigits(minutes_part);
    if (hours > 23 or minutes > 59) return error.InvalidTimestamp;
    return sign * (hours * 3600 + minutes * 60);
}

fn isLeapYear(y: i64) bool {
    return (@mod(y, 4) == 0 and @mod(y, 100) != 0) or @mod(y, 400) == 0;
}

fn daysInMonth(y: i64, m: i64) i64 {
    const days = [_]i64{ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
    if (m == 2 and isLeapYear(y)) return 29;
    return days[@intCast(m - 1)];
}

// Algoritma H. Hinnanta: datum ↔ število dni od 1970-01-01.
fn daysFromCivil(year: i64, m: i64, d: i64) i64 {
    const y = if (m <= 2) year - 1 else year;
    const era = @divFloor(y, 400);
    const yoe = y - era * 400;
    const mp = @mod(m + 9, 12);
    const doy = @divFloor(153 * mp + 2, 5) + d - 1;
    const doe = yoe * 365 + @divFloor(yoe, 4) - @divFloor(yoe, 100) + doy;
    return era * 146097 + doe - 719468;
}

const CivilDate = struct { year: i64, month: i64, day: i64 };

fn civilFromDays(days: i64) CivilDate {
    const z = days + 719468;
    const era = @divFloor(z, 146097);
    const doe = z - era * 146097;
    const yoe = @divFloor(doe - @divFloor(doe, 1460) + @divFloor(doe, 36524) - @divFloor(doe, 146096), 365);
    const doy = doe - (365 * yoe + @divFloor(yoe, 4) - @divFloor(yoe, 100));
    const mp = @divFloor(5 * doy + 2, 153);
    const d = doy - @divFloor(153 * mp + 2, 5) + 1;
    const m = if (mp < 10) mp + 3 else mp - 9;
    return .{ .year = yoe + era * 400 + @as(i64, if (m <= 2) 1 else 0), .month = m, .day = d };
}

// ----------------------------------------------------------------------------
// HTML e-pošta in JSON za Resend
// ----------------------------------------------------------------------------

pub fn buildHtmlEmail(alloc: std.mem.Allocator, body_text: []const u8) ![]const u8 {
    // escape the plain text for HTML
    var escaped = std.ArrayListUnmanaged(u8){ .items = &.{}, .capacity = 0 };
    defer escaped.deinit(alloc);
    for (body_text) |c| {
        switch (c) {
            '<' => try escaped.appendSlice(alloc, "&lt;"),
            '>' => try escaped.appendSlice(alloc, "&gt;"),
            '&' => try escaped.appendSlice(alloc, "&amp;"),
            '\n' => try escaped.appendSlice(alloc, "<br>"),
            else => try escaped.append(alloc, c),
        }
    }

    return std.fmt.allocPrint(alloc,
        \\<!DOCTYPE html>
        \\<html><head><meta charset="utf-8"></head>
        \\<body style="font-family:sans-serif;max-width:520px;margin:40px auto;color:#1a1a1a;">
        \\  <img src="https://eventease-production-5c24.up.railway.app/EventEaseIkoncaEmail.png"
        \\       alt="EventEase" width="200" style="margin-bottom:32px;">
        \\  <div style="font-size:15px;line-height:1.7;">{s}</div>
        \\  <hr style="margin:32px 0;border:none;border-top:1px solid #eee;">
        \\  <p style="font-size:12px;color:#999;">
        \\    EventEase &mdash; Enostavno usklajevanje terminov
        \\  </p>
        \\</body></html>
    , .{escaped.items});
}

/// Ubeži niz za vstavljanje med narekovaje v JSON (RFC 8259, 7).
pub fn jsonEscape(alloc: std.mem.Allocator, text: []const u8) ![]u8 {
    var out = std.ArrayListUnmanaged(u8){ .items = &.{}, .capacity = 0 };
    errdefer out.deinit(alloc);
    for (text) |c| {
        switch (c) {
            '\\' => try out.appendSlice(alloc, "\\\\"),
            '"' => try out.appendSlice(alloc, "\\\""),
            '\n' => try out.appendSlice(alloc, "\\n"),
            '\r' => try out.appendSlice(alloc, "\\r"),
            '\t' => try out.appendSlice(alloc, "\\t"),
            0...0x08, 0x0B, 0x0C, 0x0E...0x1F => {
                var buf: [6]u8 = undefined;
                try out.appendSlice(alloc, std.fmt.bufPrint(&buf, "\\u{x:0>4}", .{c}) catch unreachable);
            },
            else => try out.append(alloc, c),
        }
    }
    return out.toOwnedSlice(alloc);
}

// ----------------------------------------------------------------------------
// Testi (poimenovanje: "enota: pogoj → rezultat")
// ----------------------------------------------------------------------------

const testing = std.testing;

fn expectIcsTimestamp(expected: []const u8, input: []const u8) !void {
    var buf: [16]u8 = undefined;
    try testing.expectEqualStrings(expected, try formatIcsTimestamp(&buf, input));
}

fn expectInvalidTimestamp(input: []const u8) !void {
    var buf: [16]u8 = undefined;
    try testing.expectError(error.InvalidTimestamp, formatIcsTimestamp(&buf, input));
}

test "formatIcsTimestamp: Postgres zapis s +00 → UTC z Z" {
    try expectIcsTimestamp("20240615T140000Z", "2024-06-15 14:00:00+00");
}

test "formatIcsTimestamp: ISO zapis z Z → nespremenjen čas" {
    try expectIcsTimestamp("20240615T140000Z", "2024-06-15T14:00:00Z");
}

test "formatIcsTimestamp: pozitiven pas (+02) → odšteje 2 uri" {
    try expectIcsTimestamp("20240615T120000Z", "2024-06-15 14:00:00+02");
}

test "formatIcsTimestamp: negativen pas (-05:30) → prišteje 5 ur 30 min" {
    try expectIcsTimestamp("20240615T193000Z", "2024-06-15 14:00:00-05:30");
}

test "formatIcsTimestamp: pas brez dvopičja (+0130) → upoštevane minute" {
    try expectIcsTimestamp("20240615T123000Z", "2024-06-15 14:00:00+0130");
}

test "formatIcsTimestamp: brez pasu → obravnavan kot UTC" {
    try expectIcsTimestamp("20240615T140000Z", "2024-06-15T14:00:00");
}

test "formatIcsTimestamp: delne sekunde → odrezane" {
    try expectIcsTimestamp("20240615T140000Z", "2024-06-15 14:00:00.123456+00");
}

test "formatIcsTimestamp: pas premakne čez polnoč na prejšnje leto" {
    try expectIcsTimestamp("20231231T230000Z", "2024-01-01 00:00:00+01");
}

test "formatIcsTimestamp: pas premakne čez konec februarja v prestopnem letu" {
    try expectIcsTimestamp("20240229T230000Z", "2024-03-01 01:00:00+02");
}

test "formatIcsTimestamp: 29. februar v prestopnem letu → veljaven" {
    try expectIcsTimestamp("20240229T000000Z", "2024-02-29 00:00:00+00");
}

test "formatIcsTimestamp: 29. februar v neprestopnem letu → InvalidTimestamp" {
    try expectInvalidTimestamp("2023-02-29 00:00:00+00");
}

test "formatIcsTimestamp: leto 2000 (deljivo s 400) je prestopno, 1900 ni" {
    try expectIcsTimestamp("20000229T000000Z", "2000-02-29 00:00:00+00");
    try expectInvalidTimestamp("1900-02-29 00:00:00+00");
}

test "formatIcsTimestamp: mejne vrednosti ure (00:00:00 in 23:59:59) → veljavne" {
    try expectIcsTimestamp("20241231T235959Z", "2024-12-31 23:59:59+00");
    try expectIcsTimestamp("20240101T000000Z", "2024-01-01 00:00:00+00");
}

test "formatIcsTimestamp: vrednosti izven obsega → InvalidTimestamp" {
    try expectInvalidTimestamp("2024-13-01 00:00:00+00");
    try expectInvalidTimestamp("2024-00-01 00:00:00+00");
    try expectInvalidTimestamp("2024-04-31 00:00:00+00");
    try expectInvalidTimestamp("2024-06-15 24:00:00+00");
    try expectInvalidTimestamp("2024-06-15 14:60:00+00");
    try expectInvalidTimestamp("2024-06-15 14:00:60+00");
    try expectInvalidTimestamp("2024-06-15 14:00:00+24");
}

test "formatIcsTimestamp: napačna oblika → InvalidTimestamp" {
    try expectInvalidTimestamp("");
    try expectInvalidTimestamp("2024-06-15");
    try expectInvalidTimestamp("2024/06/15 14:00:00");
    try expectInvalidTimestamp("2024-06-15X14:00:00");
    try expectInvalidTimestamp("2024-06-15 14:00:00.+00");
    try expectInvalidTimestamp("2024-06-15 14:00:00 Europe/Ljubljana");
    try expectInvalidTimestamp("2024-06-15 14:00:00+1");
    try expectInvalidTimestamp("abcd-ef-gh ij:kl:mn");
}

test "formatIcsTimestamp: zelo dolg vhod → napaka, ne prekoračitev medpomnilnika" {
    try expectInvalidTimestamp("2024-06-15 14:00:00+00:00:00:00:00:00:00:00:00:00:00:00");
}

test "escapeIcsText: posebni znaki RFC 5545 → ubežani" {
    const out = try escapeIcsText(testing.allocator, "a,b;c\\d\ne\r\nf");
    defer testing.allocator.free(out);
    try testing.expectEqualStrings("a\\,b\\;c\\\\d\\ne\\nf", out);
}

test "escapeIcsText: prazen niz → prazen niz" {
    const out = try escapeIcsText(testing.allocator, "");
    defer testing.allocator.free(out);
    try testing.expectEqualStrings("", out);
}

test "buildIcsContent: običajen dogodek → UTC časi, CRLF vrstice, vse obvezne vrstice" {
    const ics = try buildIcsContent(testing.allocator, "Piknik", "2024-06-15 14:00:00+02", "2024-06-15 16:00:00+02");
    defer testing.allocator.free(ics);

    try testing.expect(std.mem.startsWith(u8, ics, "BEGIN:VCALENDAR\r\n"));
    try testing.expect(std.mem.endsWith(u8, ics, "END:VCALENDAR\r\n"));
    try testing.expect(std.mem.indexOf(u8, ics, "\r\nDTSTART:20240615T120000Z\r\n") != null);
    try testing.expect(std.mem.indexOf(u8, ics, "\r\nDTEND:20240615T140000Z\r\n") != null);
    try testing.expect(std.mem.indexOf(u8, ics, "\r\nSUMMARY:Piknik\r\n") != null);
    try testing.expect(std.mem.indexOf(u8, ics, "\r\nBEGIN:VEVENT\r\n") != null);
    try testing.expect(std.mem.indexOf(u8, ics, "\r\nEND:VEVENT\r\n") != null);
    // Vsak \n mora biti del \r\n.
    try testing.expectEqual(std.mem.count(u8, ics, "\n"), std.mem.count(u8, ics, "\r\n"));
}

test "buildIcsContent: naslov z novo vrstico → ne more vriniti nove ICS lastnosti" {
    const ics = try buildIcsContent(testing.allocator, "Zabava\nATTENDEE:x@y.si", "2024-06-15 14:00:00+00", "2024-06-15 15:00:00+00");
    defer testing.allocator.free(ics);
    try testing.expect(std.mem.indexOf(u8, ics, "\r\nATTENDEE:") == null);
    try testing.expect(std.mem.indexOf(u8, ics, "SUMMARY:Zabava\\nATTENDEE:x@y.si\r\n") != null);
}

test "buildIcsContent: UID brez presledkov in enak za enak vhod" {
    const a = try buildIcsContent(testing.allocator, "Moj dogodek", "2024-06-15 14:00:00+00", "2024-06-15 15:00:00+00");
    defer testing.allocator.free(a);
    const b = try buildIcsContent(testing.allocator, "Moj dogodek", "2024-06-15 14:00:00+00", "2024-06-15 15:00:00+00");
    defer testing.allocator.free(b);
    try testing.expectEqualStrings(a, b);

    const uid_start = std.mem.indexOf(u8, a, "UID:").? + 4;
    const uid_end = std.mem.indexOfPos(u8, a, uid_start, "\r\n").?;
    const uid = a[uid_start..uid_end];
    try testing.expect(std.mem.indexOfScalar(u8, uid, ' ') == null);
    try testing.expect(std.mem.endsWith(u8, uid, "@eventease"));
}

test "buildIcsContent: konec pred začetkom ali enak začetku → InvalidTimeRange" {
    try testing.expectError(error.InvalidTimeRange, buildIcsContent(testing.allocator, "x", "2024-06-15 15:00:00+00", "2024-06-15 14:00:00+00"));
    try testing.expectError(error.InvalidTimeRange, buildIcsContent(testing.allocator, "x", "2024-06-15 14:00:00+00", "2024-06-15 14:00:00+00"));
}

test "buildIcsContent: neveljaven časovni žig → InvalidTimestamp" {
    try testing.expectError(error.InvalidTimestamp, buildIcsContent(testing.allocator, "x", "včeraj", "2024-06-15 14:00:00+00"));
}

fn buildIcsAndFree(alloc: std.mem.Allocator, title: []const u8) !void {
    const ics = try buildIcsContent(alloc, title, "2024-06-15 14:00:00+00", "2024-06-15 15:00:00+00");
    alloc.free(ics);
}

test "buildIcsContent: zmanjka pomnilnika → OutOfMemory brez puščanja" {
    try testing.checkAllAllocationFailures(testing.allocator, buildIcsAndFree, .{"Piknik, ob reki; s \\ hrano"});
}

test "buildHtmlEmail: HTML znaki in nove vrstice → ubežani v telesu" {
    const html = try buildHtmlEmail(testing.allocator, "a < b & c > d\nnova");
    defer testing.allocator.free(html);
    try testing.expect(std.mem.indexOf(u8, html, ">a &lt; b &amp; c &gt; d<br>nova</div>") != null);
}

test "buildHtmlEmail: že ubežan &amp; → ubežan še enkrat (besedilo ni HTML)" {
    const html = try buildHtmlEmail(testing.allocator, "&amp;");
    defer testing.allocator.free(html);
    try testing.expect(std.mem.indexOf(u8, html, ">&amp;amp;</div>") != null);
}

test "buildHtmlEmail: poskus vrivanja <script> → ni surove značke" {
    const html = try buildHtmlEmail(testing.allocator, "<script>alert(1)</script>");
    defer testing.allocator.free(html);
    try testing.expect(std.mem.indexOf(u8, html, "<script") == null);
}

test "buildHtmlEmail: prazno besedilo → celoten dokument s praznim telesom" {
    const html = try buildHtmlEmail(testing.allocator, "");
    defer testing.allocator.free(html);
    try testing.expect(std.mem.startsWith(u8, html, "<!DOCTYPE html>"));
    try testing.expect(std.mem.endsWith(u8, html, "</body></html>"));
    try testing.expect(std.mem.indexOf(u8, html, "line-height:1.7;\"></div>") != null);
}

fn buildHtmlAndFree(alloc: std.mem.Allocator, text: []const u8) !void {
    const html = try buildHtmlEmail(alloc, text);
    alloc.free(html);
}

test "buildHtmlEmail: zmanjka pomnilnika → OutOfMemory brez puščanja" {
    try testing.checkAllAllocationFailures(testing.allocator, buildHtmlAndFree, .{"a<b>\nc&d"});
}

test "jsonEscape: narekovaji, poševnice in nove vrstice → ubežani" {
    const out = try jsonEscape(testing.allocator, "Rekla je \"živjo\"\\\n\r\t");
    defer testing.allocator.free(out);
    try testing.expectEqualStrings("Rekla je \\\"živjo\\\"\\\\\\n\\r\\t", out);
}

test "jsonEscape: ostali kontrolni znaki → \\u00XX" {
    const out = try jsonEscape(testing.allocator, "a\x00b\x1fc\x08");
    defer testing.allocator.free(out);
    try testing.expectEqualStrings("a\\u0000b\\u001fc\\u0008", out);
}

test "jsonEscape: rezultat je veljaven JSON niz, ki se vrne v izvirnik" {
    const original = "Naslov \"x\"\n\tz \\ in \x01 ter UTF-8: čšž";
    const escaped = try jsonEscape(testing.allocator, original);
    defer testing.allocator.free(escaped);
    const quoted = try std.fmt.allocPrint(testing.allocator, "\"{s}\"", .{escaped});
    defer testing.allocator.free(quoted);

    const parsed = try std.json.parseFromSlice([]const u8, testing.allocator, quoted, .{});
    defer parsed.deinit();
    try testing.expectEqualStrings(original, parsed.value);
}
