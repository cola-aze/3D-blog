// src/Overlay.jsx
import { useStore } from "./store";

export const Overlay = () => {
    const { activePost, closePost } = useStore();

    // 情况 A: 没有选中文章 -> 显示准心
    if (!activePost) {
        // 这里的 .crosshair 样式必须有 pointer-events: none
        return <div className="crosshair">+</div>;
    }

    // 情况 B: 选中了文章 -> 显示弹窗
    return (
        <div className="overlay">
            <div className="modal">
                <button onClick={closePost}>关闭</button>
                {/* ... 内容 ... */}
            </div>
        </div>
    );
};
