/**
 * Curated Material Icons ligature names, grouped for a browsable picker.
 * These are the literal strings the "Material Icons" font (loaded in
 * app/globals.css) renders via `<span className="material-icons">name</span>`
 * — every name here is a real, valid ligature, so picking one always resolves.
 */
export interface IconGroup {
  category: string;
  icons: string[];
}

export const MATERIAL_ICON_GROUPS: IconGroup[] = [
  {
    category: "Navigation",
    icons: [
      "menu", "close", "arrow_back", "arrow_forward", "arrow_upward", "arrow_downward",
      "chevron_left", "chevron_right", "expand_less", "expand_more", "unfold_more", "unfold_less",
      "first_page", "last_page", "more_vert", "more_horiz", "apps", "home", "refresh",
      "fullscreen", "fullscreen_exit", "check", "clear", "menu_open", "drag_handle",
    ],
  },
  {
    category: "Action",
    icons: [
      "add", "remove", "add_circle", "remove_circle", "add_circle_outline", "remove_circle_outline",
      "delete", "delete_outline", "edit", "done", "done_all", "search", "settings",
      "settings_applications", "favorite", "favorite_border", "star", "star_border", "star_half",
      "visibility", "visibility_off", "lock", "lock_open", "info", "info_outline", "help",
      "help_outline", "warning", "error", "error_outline", "check_circle", "check_circle_outline",
      "cancel", "block", "flag", "bookmark", "bookmark_border", "share", "download", "upload",
      "file_download", "file_upload", "print", "save", "save_alt", "sync", "autorenew", "cached",
      "history", "launch", "open_in_new", "exit_to_app", "power_settings_new", "logout", "login",
      "account_circle", "verified", "verified_user", "shopping_cart", "shopping_bag", "credit_card",
      "payment", "receipt", "local_offer", "redeem", "loyalty", "tune", "dashboard",
    ],
  },
  {
    category: "Time & Schedule",
    icons: [
      "schedule", "alarm", "timer", "event", "today", "calendar_today", "date_range",
      "filter_list", "sort", "hourglass_empty", "hourglass_full", "update", "watch_later",
    ],
  },
  {
    category: "Layout",
    icons: [
      "list", "grid_view", "view_list", "view_module", "view_agenda", "view_column",
      "view_quilt", "widgets", "table_rows", "space_dashboard", "vertical_split", "horizontal_split",
    ],
  },
  {
    category: "Communication",
    icons: [
      "mail", "email", "send", "chat", "chat_bubble", "chat_bubble_outline", "forum", "phone",
      "call", "call_end", "message", "sms", "contacts", "person", "person_add", "person_outline",
      "people", "group", "group_add", "notifications", "notifications_none", "notifications_active",
      "notifications_off", "business",
    ],
  },
  {
    category: "Content & Editing",
    icons: [
      "add_box", "archive", "backspace", "create", "content_copy", "content_cut", "content_paste",
      "drafts", "filter_alt", "font_download", "forward", "gesture", "inbox", "link", "link_off",
      "redo", "undo", "reply", "reply_all", "report", "select_all", "text_format", "unarchive",
      "format_align_center", "format_align_left", "format_align_right", "format_bold",
      "format_italic", "format_underlined", "format_list_bulleted", "format_list_numbered",
      "format_quote", "format_size", "format_color_fill", "format_color_text", "highlight",
      "title", "wrap_text", "strikethrough_s", "functions", "table_chart",
    ],
  },
  {
    category: "Charts & Data",
    icons: [
      "bar_chart", "pie_chart", "bubble_chart", "show_chart", "trending_up", "trending_down",
      "trending_flat", "assessment", "analytics", "insert_chart", "leaderboard", "timeline",
    ],
  },
  {
    category: "Media (Audio/Video)",
    icons: [
      "play_arrow", "pause", "stop", "skip_next", "skip_previous", "fast_forward", "fast_rewind",
      "volume_up", "volume_down", "volume_off", "volume_mute", "mic", "mic_off", "videocam",
      "videocam_off", "movie", "music_note", "playlist_add", "playlist_play", "repeat", "shuffle",
      "equalizer", "radio", "subtitles", "closed_caption", "hd", "loop",
    ],
  },
  {
    category: "Files & Storage",
    icons: [
      "folder", "folder_open", "folder_shared", "create_new_folder", "cloud", "cloud_upload",
      "cloud_download", "cloud_done", "cloud_off", "attachment", "attach_file", "description",
      "insert_drive_file", "picture_as_pdf", "storage", "sd_card", "backup",
    ],
  },
  {
    category: "Images",
    icons: [
      "image", "photo", "photo_camera", "camera_alt", "add_a_photo", "collections", "crop",
      "filter", "flash_on", "flash_off", "panorama", "palette", "brush", "colorize", "gradient",
      "wb_sunny", "wb_cloudy", "landscape", "portrait", "rotate_left", "rotate_right", "broken_image",
    ],
  },
  {
    category: "Social & Feedback",
    icons: [
      "cake", "domain", "location_city", "mood", "mood_bad", "sentiment_satisfied",
      "sentiment_dissatisfied", "sentiment_neutral", "public", "school", "whatshot", "thumb_up",
      "thumb_down", "poll", "emoji_emotions",
    ],
  },
  {
    category: "Toggles",
    icons: [
      "check_box", "check_box_outline_blank", "indeterminate_check_box", "radio_button_checked",
      "radio_button_unchecked", "toggle_on", "toggle_off",
    ],
  },
  {
    category: "Places & Maps",
    icons: [
      "place", "map", "my_location", "near_me", "navigation", "directions", "local_cafe",
      "local_shipping", "local_hospital", "restaurant", "hotel", "flight", "directions_car",
      "directions_bike", "directions_walk", "directions_bus", "directions_train", "train", "subway",
      "local_gas_station", "local_parking", "local_atm", "store", "storefront",
    ],
  },
  {
    category: "Devices & Hardware",
    icons: [
      "computer", "laptop", "phone_android", "phone_iphone", "tablet", "tv", "keyboard", "mouse",
      "memory", "wifi", "wifi_off", "bluetooth", "battery_full", "battery_charging_full",
      "signal_cellular_alt", "power", "usb", "headset", "speaker",
    ],
  },
  {
    category: "Security",
    icons: [
      "security", "shield", "vpn_key", "fingerprint", "gpp_good", "admin_panel_settings", "key",
    ],
  },
  {
    category: "Business & Finance",
    icons: [
      "work", "business_center", "badge", "monetization_on", "account_balance",
      "account_balance_wallet", "savings", "paid", "request_quote", "receipt_long", "attach_money",
    ],
  },
  {
    category: "Misc",
    icons: [
      "build", "construction", "handyman", "science", "category", "label", "style", "layers",
      "straighten", "texture", "extension", "eco", "spa", "pets", "child_care", "sports_esports",
    ],
  },
];

export const ALL_MATERIAL_ICONS: string[] = MATERIAL_ICON_GROUPS.flatMap((g) => g.icons);

export function iconDisplayLabel(name: string): string {
  return name
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
