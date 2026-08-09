"""
ORM 声明式基类（便捷重导出）

所有模型均应继承此类。
"""

from app.core.database import Base

__all__ = ["Base"]
