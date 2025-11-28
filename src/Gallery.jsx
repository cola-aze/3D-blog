import { RigidBody } from "@react-three/rapier";
import { Text, Image, useCursor } from "@react-three/drei";
import { useState } from "react";
import { useStore } from "./store";
import * as THREE from "three";

// 模拟博客数据
const POSTS = [
    {
        id: 1,
        title: "Web 3D 启蒙",
        img: "https://picsum.photos/id/122/800/600",
        content: "WebGL 的世界大门...",
        position: [-2, 2, -5],
    },
    {
        id: 2,
        title: "React 生态",
        img: "https://picsum.photos/id/123/800/600",
        content: "组件化思维...",
        position: [2, 2, -10],
    },
    {
        id: 3,
        title: "物理引擎",
        img: "https://picsum.photos/id/124/800/600",
        content: "Rapier 带来的重力...",
        position: [-2, 2, -15],
    },
    {
        id: 4,
        title: "未来已来",
        img: "https://picsum.photos/id/125/800/600",
        content: "元宇宙的雏形...",
        position: [2, 2, -20],
    },
];

// 单个画框组件
const Frame = ({ data }) => {
    const [hovered, setHover] = useState(false);
    const setActivePost = useStore((state) => state.setActivePost);

    // 鼠标悬停时改变鼠标样式
    useCursor(hovered);

    return (
        <group position={data.position}>
            {/* 
         画框主体：静态刚体 (Fixed) 
         onPointerOver/Out: 鼠标悬停检测
         onClick: 打开文章
      */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh
                    onPointerOver={() => setHover(true)}
                    onPointerOut={() => setHover(false)}
                    onClick={() => setActivePost(data)}
                >
                    {/* 画框边框 */}
                    <boxGeometry args={[3, 2.2, 0.2]} />
                    <meshStandardMaterial
                        color={hovered ? "#ff6b6b" : "#333"}
                    />
                </mesh>
            </RigidBody>

            {/* 图片内容 */}
            <Image
                url={data.img}
                position={[0, 0, 0.11]} // 稍微突出一点，避免闪烁
                args={[2.8, 2]}
            />

            {/* 3D 标题 */}
            <Text
                position={[0, 1.4, 0]}
                fontSize={0.25}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {data.title}
            </Text>
        </group>
    );
};

export const Gallery = () => {
    return (
        <group>
            {/* 1. 地板 (无限延伸的感觉) */}
            <RigidBody type="fixed" friction={2}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -25]}>
                    <planeGeometry args={[20, 100]} />
                    <meshStandardMaterial
                        color="#1a1a1a"
                        roughness={0.8}
                        metalness={0.2}
                    />
                </mesh>
            </RigidBody>

            {/* 2. 墙壁 (防止玩家掉出去) */}
            <RigidBody type="fixed">
                {/* 左墙 */}
                <mesh position={[-10, 5, -25]}>
                    <boxGeometry args={[1, 10, 100]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                {/* 右墙 */}
                <mesh position={[10, 5, -25]}>
                    <boxGeometry args={[1, 10, 100]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
            </RigidBody>

            {/* 3. 生成画框 */}
            {POSTS.map((post) => (
                <Frame key={post.id} data={post} />
            ))}

            {/* 4. 装饰灯光 (营造画廊氛围) */}
            {POSTS.map((post, i) => (
                <pointLight
                    key={i}
                    position={[post.position[0], 4, post.position[2]]}
                    intensity={2}
                    distance={6}
                    color="#ffaa00"
                />
            ))}
        </group>
    );
};
