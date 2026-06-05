const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const httpz = b.dependency("httpz", .{}).module("httpz");
    const pg_module = b.dependency("pg", .{}).module("pg");

    const exe = b.addExecutable(.{
        .name = "logic",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
            .imports = &.{
                .{ .name = "pg", .module = pg_module },
                .{ .name = "httpz", .module = httpz },
            },
        }),
    });

    b.installArtifact(exe);

    const run_step = b.step("run", "Run the app");
    const run_cmd = b.addRunArtifact(exe);
    run_step.dependOn(&run_cmd.step);
    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const uuid_tests = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/uuid.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    const run_uuid_tests = b.addRunArtifact(uuid_tests);

    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_uuid_tests.step);
}
