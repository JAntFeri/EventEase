const std = @import("std");
const httpz = @import("httpz");
const App = @import("main.zig").App;

const MimeMap = std.StaticStringMap([]const u8).initComptime(.{
    .{ ".html", "text/html; charset=utf-8" },
    .{ ".css",  "text/css; charset=utf-8" },
    .{ ".js",   "application/javascript; charset=utf-8" },
    .{ ".json", "application/json" },
    .{ ".svg",  "image/svg+xml" },
    .{ ".png",  "image/png" },
    .{ ".ico",  "image/x-icon" },
});

pub fn handle(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    var path = req.url.path;
    if (path.len > 0 and path[0] == '/') path = path[1..];
    if (path.len == 0) path = "index.html";

    const io = app.io;
    const full_path = try std.fs.path.join(res.arena, &.{ "public", path });

    var file = std.Io.Dir.cwd().openFile(io, full_path, .{}) catch {
        const index_path = try std.fs.path.join(res.arena, &.{ "public", "index.html" });
        var index_file = std.Io.Dir.cwd().openFile(io, index_path, .{}) catch {
            res.status = 404;
            res.body = "Not Found";
            return;
        };
        defer index_file.close(io);

        const len = try index_file.length(io);
        const buffer = try res.arena.alloc(u8, len);
        _ = try index_file.readPositionalAll(io, buffer, 0);
        res.content_type = .HTML;
        res.body = buffer;
        return;
    };
    defer file.close(io);

    const len = try file.length(io);
    const buffer = try res.arena.alloc(u8, len);
    _ = try file.readPositionalAll(io, buffer, 0);

    const ext = std.fs.path.extension(full_path);
    if (MimeMap.get(ext)) |mime| {
        res.content_type = .UNKNOWN;
        try res.headerOpts("Content-Type", mime, .{ .dupe_value = true });
    } else {
        res.content_type = .BINARY;
    }

    res.body = buffer;
}
