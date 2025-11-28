import { create } from "zustand";

export const useStore = create((set) => ({
    activePost: null, // 当前打开的文章数据
    setActivePost: (post) => set({ activePost: post }), // 打开文章
    closePost: () => set({ activePost: null }), // 关闭文章
}));
