fn main() {
    const APP_COMMANDS: &[&str] = &[
        "desktop_bridge_open_chat_panel",
        "desktop_bridge_close_chat_panel",
        "desktop_bridge_set_ball_position",
        "desktop_bridge_get_ball_position",
        "desktop_bridge_set_panel_position_near_ball",
    ];

    tauri_build::build();
}
