/**
 * 应用级常量配置
 * 消除魔法数字，提高代码可读性
 */

// ============ 拖放相关 ============
/** 拖放悬停多久后触发合并（毫秒） */
export const DRAG_MERGE_DELAY_MS = 600

/** 拖放删除区域的红色遮罩透明度 */
export const DROP_DELETE_OVERLAY_OPACITY = 0.2

// ============ 图标相关 ============
/** 上传图标文件大小上限（KB） */
export const ICON_FILE_MAX_SIZE_KB = 450

/** 图标检查超时时间（毫秒）— 供 site-icon 候选探测用 */
export const ICON_CHECK_TIMEOUT_MS = 4500

// ============ 图片上传相关 ============
/** 壁纸上传文件大小上限（MB） */
export const WALLPAPER_FILE_MAX_SIZE_MB = 3

// ============ 滚动相关 ============
/** 精选图库滚动加载阈值（像素） */
export const SCROLL_LOAD_THRESHOLD_PX = 100

/** 精选图库首次渲染数量 */
export const WALLPAPER_GALLERY_PAGE_SIZE = 15

// ============ 网格布局相关 ============
/** 书签面板行距（固定值） */
export const BOOKMARK_GRID_GAP_Y = 24

/** 书签面板列距（固定值） */
export const BOOKMARK_GRID_GAP_X = 16

/** 图标额外空间（用于标题） */
export const ICON_LABEL_SPACE_PX = 20

/** 默认图标边长（px）— 设置未提供时的回退值 */
export const DEFAULT_ICON_SIZE = 54

// ============ 壁纸相关 ============
/** 壁纸轮播最小间隔（秒） */
export const WALLPAPER_MIN_INTERVAL_SEC = 15

/** 壁纸默认间隔（秒） */
export const WALLPAPER_DEFAULT_INTERVAL_SEC = 60

// ============ 动画相关 ============
/** 重排序指示器动画延迟（毫秒） */
export const REORDER_INDICATOR_DELAY_MS = 200

/** Modal 动画持续时间（毫秒） */
export const MODAL_ANIMATION_DURATION_MS = 200

// ============ 索引相关 ============
/** IndexedDB 数据库名称 */
export const IDB_DATABASE_NAME = "coeurvers-wallpaper-v1"

/** IndexedDB 对象存储名称 */
export const IDB_STORE_NAME = "wallpapers"

/** IndexedDB 数据库版本 */
export const IDB_VERSION = 1
