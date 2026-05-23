pub const packages = struct {
    pub const @"N-V-__8AAEGLAACZXqfn1yrAh1MKBAy7tUw-fQIEFU9bopsi" = struct {
        pub const build_root = "/home/niro/Projects/EventEase/backend/logic/zig-pkg/N-V-__8AAEGLAACZXqfn1yrAh1MKBAy7tUw-fQIEFU9bopsi";
        pub const build_zig = @import("N-V-__8AAEGLAACZXqfn1yrAh1MKBAy7tUw-fQIEFU9bopsi");
        pub const deps: []const struct { []const u8, []const u8 } = &.{};
    };
    pub const @"aro-0.0.0-JSD1Qi7QNgDnfcrdEJf82v3o6MhZySjYVrtdfEf3E4Se" = struct {
        pub const build_root = "/home/niro/Projects/EventEase/backend/logic/zig-pkg/aro-0.0.0-JSD1Qi7QNgDnfcrdEJf82v3o6MhZySjYVrtdfEf3E4Se";
        pub const build_zig = @import("aro-0.0.0-JSD1Qi7QNgDnfcrdEJf82v3o6MhZySjYVrtdfEf3E4Se");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
        };
    };
    pub const @"httpz-0.0.0-PNVzrLjJCAD37S0CcrXpsjSqr86hVjK0rsALTDJ98AAJ" = struct {
        pub const build_root = "/home/niro/Projects/EventEase/backend/logic/zig-pkg/httpz-0.0.0-PNVzrLjJCAD37S0CcrXpsjSqr86hVjK0rsALTDJ98AAJ";
        pub const build_zig = @import("httpz-0.0.0-PNVzrLjJCAD37S0CcrXpsjSqr86hVjK0rsALTDJ98AAJ");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
            .{ "metrics", "metrics-0.0.0-W7G4eIegAQD4XxA9Co7Atbw59u_2zvxYf406AZuoAHPM" },
            .{ "websocket", "websocket-0.1.0-ZPISdV_aBACU9pGuvrTQ2z8uxz_Sp8JnJgQaiGKQIx1l" },
        };
    };
    pub const @"metrics-0.0.0-W7G4eIegAQD4XxA9Co7Atbw59u_2zvxYf406AZuoAHPM" = struct {
        pub const build_root = "/home/niro/Projects/EventEase/backend/logic/zig-pkg/metrics-0.0.0-W7G4eIegAQD4XxA9Co7Atbw59u_2zvxYf406AZuoAHPM";
        pub const build_zig = @import("metrics-0.0.0-W7G4eIegAQD4XxA9Co7Atbw59u_2zvxYf406AZuoAHPM");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
        };
    };
    pub const @"pg-0.0.0-Wp_7gViDBgDB4734XO6MhGbrvDwWTwX9lFF8Rr9-R3p7" = struct {
        pub const build_root = "/home/niro/Projects/EventEase/backend/logic/zig-pkg/pg-0.0.0-Wp_7gViDBgDB4734XO6MhGbrvDwWTwX9lFF8Rr9-R3p7";
        pub const build_zig = @import("pg-0.0.0-Wp_7gViDBgDB4734XO6MhGbrvDwWTwX9lFF8Rr9-R3p7");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
            .{ "buffer", "N-V-__8AAEGLAACZXqfn1yrAh1MKBAy7tUw-fQIEFU9bopsi" },
            .{ "metrics", "metrics-0.0.0-W7G4eIegAQD4XxA9Co7Atbw59u_2zvxYf406AZuoAHPM" },
            .{ "translate_c", "translate_c-0.0.0-Q_BUWlX1BgCD1wo6uo97prlp9VJ4gxAjwN_vZ7nsSjGN" },
        };
    };
    pub const @"translate_c-0.0.0-Q_BUWlX1BgCD1wo6uo97prlp9VJ4gxAjwN_vZ7nsSjGN" = struct {
        pub const build_root = "/home/niro/Projects/EventEase/backend/logic/zig-pkg/translate_c-0.0.0-Q_BUWlX1BgCD1wo6uo97prlp9VJ4gxAjwN_vZ7nsSjGN";
        pub const build_zig = @import("translate_c-0.0.0-Q_BUWlX1BgCD1wo6uo97prlp9VJ4gxAjwN_vZ7nsSjGN");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
            .{ "aro", "aro-0.0.0-JSD1Qi7QNgDnfcrdEJf82v3o6MhZySjYVrtdfEf3E4Se" },
        };
    };
    pub const @"websocket-0.1.0-ZPISdV_aBACU9pGuvrTQ2z8uxz_Sp8JnJgQaiGKQIx1l" = struct {
        pub const build_root = "/home/niro/Projects/EventEase/backend/logic/zig-pkg/websocket-0.1.0-ZPISdV_aBACU9pGuvrTQ2z8uxz_Sp8JnJgQaiGKQIx1l";
        pub const build_zig = @import("websocket-0.1.0-ZPISdV_aBACU9pGuvrTQ2z8uxz_Sp8JnJgQaiGKQIx1l");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
        };
    };
};

pub const root_deps: []const struct { []const u8, []const u8 } = &.{
    .{ "httpz", "httpz-0.0.0-PNVzrLjJCAD37S0CcrXpsjSqr86hVjK0rsALTDJ98AAJ" },
    .{ "pg", "pg-0.0.0-Wp_7gViDBgDB4734XO6MhGbrvDwWTwX9lFF8Rr9-R3p7" },
};
