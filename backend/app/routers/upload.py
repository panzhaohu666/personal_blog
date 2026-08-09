"""
文件上传路由

管理端图片上传，支持格式校验和唯一文件名。
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.schemas.post import UploadResponse

router = APIRouter()
settings = get_settings()

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.post(
    "/api/admin/upload",
    response_model=UploadResponse,
    tags=["管理-上传"],
)
async def upload_image(
    file: UploadFile,
    _user=Depends(get_current_user),
) -> UploadResponse:
    """上传图片文件（需要认证）。

    文件将保存到 UPLOAD_DIR/uploads/YYYY/MM/ 下，使用 UUID 前缀避免文件名冲突。
    仅允许 jpg/jpeg/png/gif/webp 格式，最大 {settings.MAX_UPLOAD_SIZE_MB}MB。
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件名不能为空",
        )

    # 校验扩展名
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型 '.{ext}'，仅允许: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 校验文件大小
    content = await file.read()
    file_size = len(content)
    if file_size > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"文件大小 {file_size} 字节超过上限 {MAX_SIZE_BYTES} 字节（{settings.MAX_UPLOAD_SIZE_MB}MB）",
        )

    # 生成存储路径: UPLOAD_DIR/uploads/YYYY/MM/uuid-original.ext
    now = datetime.now()
    year_month = now.strftime("%Y/%m")
    unique_name = f"{uuid.uuid4().hex[:12]}-{file.filename}"
    relative_dir = settings.UPLOAD_DIR / "uploads" / year_month
    relative_dir.mkdir(parents=True, exist_ok=True)
    file_path = relative_dir / unique_name

    # 写入文件（同步写入普通文件，因为已读取到内存）
    file_path.write_bytes(content)

    # 构造 URL
    url = f"/uploads/{year_month}/{unique_name}"

    return UploadResponse(
        url=url,
        filename=file.filename,
        size=file_size,
    )
