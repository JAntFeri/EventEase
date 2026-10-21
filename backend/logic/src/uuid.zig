const std = @import("std");

pub fn uuidToHex(raw: []const u8, arena: std.mem.Allocator) ![]const u8 {
    if (raw.len != 16) return error.InvalidUUID;
    const hex = "0123456789abcdef";
    var buf: [36]u8 = undefined;
    var j: usize = 0;
    for (0..16) |i| {
        if (i == 4 or i == 6 or i == 8 or i == 10) {
            buf[j] = '-';
            j += 1;
        }
        buf[j] = hex[raw[i] >> 4];
        j += 1;
        buf[j] = hex[raw[i] & 0x0F];
        j += 1;
    }
    return arena.dupe(u8, &buf);
}

fn isDashPosition(i: usize) bool {
    return i == 8 or i == 13 or i == 18 or i == 23;
}

pub fn hexToUuid(hex: []const u8, arena: std.mem.Allocator) ![]const u8 {
    if (hex.len != 36) return error.InvalidUUID;
    var raw: [16]u8 = undefined;
    var i: usize = 0;
    var j: usize = 0;
    while (i < 36) : (i += 1) {
        const c = hex[i];
        if (isDashPosition(i)) {
            if (c != '-') return error.InvalidUUID;
            continue;
        }
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
    return try arena.dupe(u8, &raw);
}

pub fn uuidV4(arena: std.mem.Allocator, rng: std.Random) ![]const u8 {
    var bytes: [16]u8 = undefined;
    rng.bytes(&bytes);
    bytes[6] = (bytes[6] & 0x0F) | 0x40;
    bytes[8] = (bytes[8] & 0x3F) | 0x80;

    return uuidToHex(&bytes, arena);
}

pub fn isValidUuidHex(hex: []const u8) bool {
    if (hex.len != 36) return false;
    for (hex, 0..) |c, i| {
        if (isDashPosition(i)) {
            if (c != '-') return false;
            continue;
        }
        switch (c) {
            '0'...'9', 'a'...'f', 'A'...'F' => {},
            else => return false,
        }
    }
    return true;
}

test "uuid hex roundtrip" {
    const arena = std.testing.allocator;
    const hex = "550e8400-e29b-41d4-a716-446655440000";

    const raw = try hexToUuid(hex, arena);
    defer arena.free(raw);
    try std.testing.expectEqual(@as(usize, 16), raw.len);

    const back = try uuidToHex(raw, arena);
    defer arena.free(back);
    try std.testing.expectEqualStrings(hex, back);
}

test "hexToUuid accepts uppercase" {
    const arena = std.testing.allocator;
    const hex = "550E8400-E29B-41D4-A716-446655440000";
    const raw = try hexToUuid(hex, arena);
    defer arena.free(raw);
    const back = try uuidToHex(raw, arena);
    defer arena.free(back);
    try std.testing.expectEqualStrings("550e8400-e29b-41d4-a716-446655440000", back);
}

test "hexToUuid rejects invalid input" {
    const arena = std.testing.allocator;

    try std.testing.expectError(error.InvalidUUID, hexToUuid("not-a-uuid", arena));
    try std.testing.expectError(error.InvalidUUID, hexToUuid("550e8400-e29b-41d4-a716-44665544000g", arena));
    try std.testing.expectError(error.InvalidUUID, hexToUuid("550e8400-e29b-41d4-a716-44665544000", arena));
}

test "uuidToHex rejects wrong length" {
    const arena = std.testing.allocator;
    const bytes = [_]u8{ 0x01, 0x02, 0x03 };
    try std.testing.expectError(error.InvalidUUID, uuidToHex(&bytes, arena));
}

test "uuidV4 format" {
    const arena = std.testing.allocator;
    var prng = std.Random.DefaultPrng.init(0x12345678);
    const hex = try uuidV4(arena, prng.random());
    defer arena.free(hex);

    try std.testing.expect(isValidUuidHex(hex));
    try std.testing.expectEqual(@as(u8, '4'), hex[14]);
    const variant_nibble = hex[19];
    try std.testing.expect(variant_nibble == '8' or variant_nibble == '9' or variant_nibble == 'a' or variant_nibble == 'b');
}

test "isValidUuidHex" {
    try std.testing.expect(isValidUuidHex("550e8400-e29b-41d4-a716-446655440000"));
    try std.testing.expect(!isValidUuidHex("550e8400-e29b-41d4-a716"));
    try std.testing.expect(!isValidUuidHex("gggggggg-gggg-gggg-gggg-gggggggggggg"));
}

test "isValidUuidHex: 36 znakov z vezaji na napačnih mestih → false" {
    try std.testing.expect(!isValidUuidHex("550e8400e29b41d4a716446655440000----"));
    try std.testing.expect(!isValidUuidHex("550e8400-e29b41d4-a716-446655440000-"));
}

test "hexToUuid: vezaji na napačnih mestih → InvalidUUID" {
    try std.testing.expectError(error.InvalidUUID, hexToUuid("550e8400e29b41d4a716446655440000----", std.testing.allocator));
}

test "uuidV4: več semen → vedno veljavna različica 4 in različica RFC 4122" {
    for ([_]u64{ 0, 1, 0xdeadbeef, std.math.maxInt(u64) }) |seed| {
        var prng = std.Random.DefaultPrng.init(seed);
        const hex = try uuidV4(std.testing.allocator, prng.random());
        defer std.testing.allocator.free(hex);
        try std.testing.expect(isValidUuidHex(hex));
        try std.testing.expectEqual(@as(u8, '4'), hex[14]);
        try std.testing.expect(std.mem.indexOfScalar(u8, "89ab", hex[19]) != null);
    }
}

test "uuidToHex: robni bajti 0x00 in 0xFF → pravilni hex" {
    const zeros = [_]u8{0} ** 16;
    const ones = [_]u8{0xFF} ** 16;
    const a = try uuidToHex(&zeros, std.testing.allocator);
    defer std.testing.allocator.free(a);
    const b = try uuidToHex(&ones, std.testing.allocator);
    defer std.testing.allocator.free(b);
    try std.testing.expectEqualStrings("00000000-0000-0000-0000-000000000000", a);
    try std.testing.expectEqualStrings("ffffffff-ffff-ffff-ffff-ffffffffffff", b);
}
