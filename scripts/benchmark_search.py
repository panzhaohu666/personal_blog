#!/usr/bin/env python3
"""
全文搜索引擎性能对比基准测试

对比 ILIKE 模糊搜索与 PostgreSQL tsvector 全文搜索的性能差异。

用法:
    cd backend
    python ../scripts/benchmark_search.py                    # 运行所有引擎
    python ../scripts/benchmark_search.py --engine ilike     # 仅测试 ILIKE
    python ../scripts/benchmark_search.py --engine tsvector  # 仅测试 tsvector
    python ../scripts/benchmark_search.py --posts 500 --queries 50  # 自定义参数

输出:
    - 终端 Markdown 格式对比报告
    - scripts/benchmark_result.json 结果数据

前置条件:
    - PostgreSQL 数据库已启动并迁移完毕
    - 运行前需先执行 alembic upgrade head 以创建 search_vector 列
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

# 确保 backend 在 Python 路径中
_backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(_backend_dir))

from sqlalchemy import text

from app.core.database import async_session_factory
from app.models.post import Post, PostStatus
from app.search import get_search_engine, SEARCH_ENGINES

# ── 中文测试语料 ────────────────────────────────────────────────

_TITLES = [
    "Python 异步编程最佳实践",
    "FastAPI 框架深入解析",
    "PostgreSQL 全文搜索指南",
    "Docker 容器化部署实战",
    "Redis 缓存策略与优化",
    "机器学习入门教程",
    "微服务架构设计模式",
    "Kubernetes 集群管理",
    "React 前端性能优化",
    "Git 工作流程与团队协作",
    "Linux 系统调优技巧",
    "网络安全防护基础",
    "数据库索引优化策略",
    "消息队列 Kafka 实战",
    "分布式系统一致性协议",
    "CI/CD 流水线搭建指南",
    "RESTful API 设计规范",
    "GraphQL 接口开发入门",
    "WebSocket 实时通信原理",
    "Nginx 反向代理配置详解",
    "单元测试与 TDD 实践",
    "设计模式在 Python 中的应用",
    "数据可视化工具对比",
    "云计算架构演进之路",
    "自然语言处理技术综述",
    "函数式编程思维模式",
    "区块链核心技术揭秘",
    "高并发系统设计方案",
    "Elasticsearch 搜索引擎调优",
    "算法与数据结构精讲",
    "自动化运维工具链",
    "前端工程化实践指南",
    "移动端适配与响应式设计",
    "性能压测与监控体系",
    "Serverless 架构实践",
    "TypeScript 类型系统深度剖析",
    "WebAssembly 入门与实践",
    "可观测性三支柱: 日志、指标、追踪",
    "边缘计算与 CDN 加速",
    "推荐系统算法详解",
]

_BODIES = [
    """
在当今快速发展的技术领域，掌握最新的编程范式和工具至关重要。本文详细介绍了相关概念，
并结合实际案例展示了如何在生产环境中应用这些技术。通过深入浅出的讲解，读者可以快速
掌握核心知识点，并将其应用到自己的项目中。

技术的选型往往需要权衡多方面的因素，包括性能、可维护性、社区活跃度等。本文从多个维度
进行了对比分析，帮助读者做出明智的决策。同时，文中也指出了一些常见的误区和陷阱，
避免读者在实践过程中踩坑。
    """,
    """
本篇文章聚焦于软件架构的核心原则。好的架构应当是灵活的、可扩展的，并且能够适应业务需求
的快速变化。我们从 SOLID 原则出发，逐步深入到领域驱动设计（DDD）的核心思想。

在实际项目中，架构的演进是一个持续的过程。没有一劳永逸的完美架构，只有不断适应变化的
务实选择。通过案例分享，读者可以了解到在真实场景中架构决策的背后逻辑。
    """,
    """
性能优化是后端开发中永恒的话题。从 SQL 查询优化到缓存策略，从异步 I/O 到连接池管理，
每一个环节都可能成为系统的瓶颈。本文系统地梳理了常见的性能优化手段。

数据库查询优化是重中之重。合理使用索引、避免 N+1 查询、善用连接池，这些基础但关键的
技术往往能带来数倍甚至数十倍的性能提升。本文通过具体的 SQL 示例展示了优化的实际效果。
    """,
    """
容器化技术已经彻底改变了软件交付的方式。Docker 的轻量级隔离、Kubernetes 的强大编排
能力，使得微服务架构从理论走向了大规模实践。

然而，容器化也带来了新的挑战。镜像体积优化、网络通信、存储持久化、安全隔离等问题
都需要开发者认真对待。本文全面梳理了容器化落地的关键技术和经验教训。
    """,
    """
人工智能正在重塑各个行业。从计算机视觉到自然语言处理，从推荐系统到自动驾驶，AI 技术
的应用场景日益丰富。深度学习和强化学习的突破性进展，让我们离真正的智能更近了一步。

但是 AI 在日常工作中的应用也面临诸多挑战：数据质量、模型解释性、部署复杂度、成本控制
等。本文从工程实践的角度出发，探讨了如何将 AI 能力高效地集成到现有系统中。
    """,
    """
前端技术栈的演进速度令人眼花缭乱。React、Vue、Angular 三大框架各有千秋，选择合适的
工具链对于项目的长期维护至关重要。

组件化开发、状态管理、路由设计、构建工具链，这些都是前端工程化的核心要素。本文通过
一个完整的项目示例，展示了现代前端开发的最佳实践和常见问题的解决方案。
    """,
    """
安全是每一个开发者都必须重视的课题。OWASP Top 10 列出了最常见的 Web 安全漏洞，
从 SQL 注入到 XSS 攻击，从 CSRF 到不安全的反序列化。

本文不仅介绍了这些漏洞的原理和危害，更提供了具体的防御措施和代码示例。安全不是
一次性的检查清单，而是需要贯穿整个软件开发生命周期的持续实践。
    """,
    """
DevOps 文化强调开发与运维的紧密协作。持续集成、持续交付、基础设施即代码等实践，
使得软件交付的速度和质量都得到了显著提升。

监控和可观测性是 DevOps 的核心支柱。Prometheus、Grafana、ELK 等工具链为系统
提供了全方位的可见性。本文分享了搭建企业级监控体系的经验和方法论。
    """,
    """
数据是现代企业的核心资产。如何高效地存储、处理和分析海量数据，是每个技术团队
都需要面对的挑战。从关系型数据库到 NoSQL，从批处理到流处理，数据技术栈日趋多样。

本文从数据架构的角度出发，探讨了数据仓库、数据湖、实时计算等不同场景下的技术
选型和最佳实践。
    """,
    """
开源软件推动了整个互联网行业的发展。Linux、Git、Python、TensorFlow，这些
耳熟能详的项目改变了技术世界的面貌。

贡献开源项目不仅是回馈社区的方式，也是提升个人技术能力的绝佳途径。本文介绍了
如何从零开始参与开源项目，包括寻找适合新手的 issue、遵循贡献规范、提交 PR 等
实用技巧。
    """,
]


def _random_title() -> str:
    return random.choice(_TITLES)


def _random_body() -> str:
    return random.choice(_BODIES)


# ── 测试数据生成 ────────────────────────────────────────────────


async def generate_posts(count: int = 500) -> None:
    """生成指定数量的测试文章，填充到数据库中。"""
    print(f"🔄 正在生成 {count} 篇测试文章...")

    async with async_session_factory() as db:
        # 先删除旧测试数据（slug 以 bench- 开头）
        stmt = text("DELETE FROM posts WHERE slug LIKE 'bench-%'")
        await db.execute(stmt)
        await db.commit()

        posts_to_add: list[Post] = []
        for i in range(count):
            title = _random_title()
            # 在标题后加序号确保 slug 唯一
            display_title = f"{title} #{i + 1}"
            post = Post(
                title=display_title,
                slug=f"bench-{i + 1}",
                body=_random_body(),
                status=PostStatus.PUBLISHED,
            )
            posts_to_add.append(post)

        db.add_all(posts_to_add)
        await db.commit()

    print(f"✅ 已生成 {count} 篇测试文章")


# ── 基准测试 ────────────────────────────────────────────────────


_QUERIES = [
    "Python",
    "数据库",
    "Docker",
    "性能优化",
    "架构",
    "前端",
    "安全",
    "机器学习",
    "微服务",
    "Redis",
    "Kubernetes",
    "算法",
    "人工智能",
    "分布式系统",
    "搜索引擎",
    "异步编程",
    "缓存",
    "监控",
    "测试",
    "部署",
    "API",
    "数据可视化",
    "开源",
    "容器化",
    "Linux",
]


async def benchmark_engine(
    engine_name: str,
    queries: list[str],
    warmup: bool = True,
) -> dict:
    """对单个搜索引擎运行基准测试。

    Returns:
        {
            "engine": str,
            "avg_ms": float,
            "p50_ms": float,
            "p95_ms": float,
            "p99_ms": float,
            "qps": float,
            "total_queries": int,
            "total_ms": float,
            "errors": int,
        }
    """
    engine = get_search_engine(engine_name)
    latencies: list[float] = []
    errors = 0

    async with async_session_factory() as db:
        # 预热
        if warmup:
            for _ in range(3):
                await engine.search(db, query="预热查询", page=1, size=10)

        # 正式测试
        for q in queries:
            try:
                result = await engine.search(db, query=q, page=1, size=10)
                latencies.append(result["took_ms"])
            except Exception:
                errors += 1

    if not latencies:
        return {
            "engine": engine_name,
            "avg_ms": 0,
            "p50_ms": 0,
            "p95_ms": 0,
            "p99_ms": 0,
            "qps": 0,
            "total_queries": len(queries),
            "total_ms": 0,
            "errors": errors,
        }

    sorted_lat = sorted(latencies)
    n = len(sorted_lat)

    total_ms = sum(latencies)
    avg_ms = total_ms / n

    def percentile(data: list[float], p: float) -> float:
        """计算第 p 百分位数（p 为 0-100 的浮点数）。"""
        if not data:
            return 0.0
        k = (p / 100) * (len(data) - 1)
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return data[int(k)]
        return data[f] * (c - k) + data[c] * (k - f)

    return {
        "engine": engine_name,
        "avg_ms": round(avg_ms, 2),
        "p50_ms": round(percentile(sorted_lat, 50), 2),
        "p95_ms": round(percentile(sorted_lat, 95), 2),
        "p99_ms": round(percentile(sorted_lat, 99), 2),
        "qps": round(n / (total_ms / 1000), 2) if total_ms > 0 else 0,
        "total_queries": n,
        "total_ms": round(total_ms, 2),
        "errors": errors,
    }


# ── 报告输出 ─────────────────────────────────────────────────────


def print_markdown_report(results: list[dict]) -> None:
    """打印 Markdown 格式的对比报告。"""
    print("\n" + "=" * 70)
    print("📊 搜索引擎性能对比报告")
    print("=" * 70)

    header = (
        "| 引擎 | 查询数 | 平均(ms) | P50(ms) | P95(ms) | P99(ms) | QPS | 错误 |"
    )
    sep = (
        "|------|--------|---------|---------|---------|---------|-----|------|"
    )
    print(header)
    print(sep)

    for r in results:
        print(
            f"| {r['engine']:8s} "
            f"| {r['total_queries']:6d} "
            f"| {r['avg_ms']:7.2f} "
            f"| {r['p50_ms']:7.2f} "
            f"| {r['p95_ms']:7.2f} "
            f"| {r['p99_ms']:7.2f} "
            f"| {r['qps']:4.1f} "
            f"| {r['errors']:4d} |"
        )

    print(sep)

    if len(results) >= 2:
        r1, r2 = results[0], results[1]
        if r1["avg_ms"] > 0 and r2["avg_ms"] > 0:
            faster = r1 if r1["avg_ms"] < r2["avg_ms"] else r2
            slower = r2 if faster is r1 else r1
            ratio = slower["avg_ms"] / faster["avg_ms"]
            print(
                f"\n⚡ **{faster['engine']}** 比 **{slower['engine']}** "
                f"快 **{ratio:.1f}x** "
                f"（平均延迟: {faster['avg_ms']}ms vs {slower['avg_ms']}ms）"
            )

    print()


def save_json_report(results: list[dict], output_path: str) -> None:
    """将结果保存为 JSON 文件。"""
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"📁 报告已保存到: {output_path}")


# ── 主流程 ───────────────────────────────────────────────────────


async def main(
    engine_name: str | None = None,
    post_count: int = 500,
    query_count: int = 50,
) -> None:
    """运行基准测试主流程。"""
    # 选择查询（从预定义列表取前 N 条）
    queries = _QUERIES[: min(query_count, len(_QUERIES))]

    # 生成测试数据
    await generate_posts(post_count)

    # 选择待测试的引擎
    if engine_name:
        engine_list = [engine_name]
    else:
        engine_list = list(SEARCH_ENGINES.keys())

    print(f"\n🔬 开始基准测试（{len(queries)} 个查询，{post_count} 篇文章）...\n")

    results: list[dict] = []
    for name in engine_list:
        print(f"  ⏳ 测试引擎: {name}...")
        result = await benchmark_engine(name, queries)
        results.append(result)
        print(f"  ✅ {name}: avg={result['avg_ms']}ms, qps={result['qps']}")

    # 输出报告
    print_markdown_report(results)

    output_path = Path(__file__).parent / "benchmark_result.json"
    save_json_report(results, str(output_path))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="搜索引擎性能基准测试")
    parser.add_argument(
        "--engine",
        choices=["ilike", "tsvector"],
        default=None,
        help="指定搜索引擎（不指定则测试全部）",
    )
    parser.add_argument(
        "--posts",
        type=int,
        default=500,
        help="生成的测试文章数量 (默认: 500)",
    )
    parser.add_argument(
        "--queries",
        type=int,
        default=50,
        help="每个引擎的查询次数 (默认: 50)",
    )
    args = parser.parse_args()

    asyncio.run(
        main(
            engine_name=args.engine,
            post_count=args.posts,
            query_count=args.queries,
        )
    )
