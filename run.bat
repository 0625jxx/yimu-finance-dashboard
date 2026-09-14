@echo off
chcp 65001 >nul
title 一目个人财务管理与可视化看板
echo 正在启动一目个人财务看板...
echo 启动后请访问 http://127.0.0.1:4173/
java -jar deliverables\yimu-finance-dashboard.jar
if errorlevel 1 (
  echo.
  echo 启动失败，请确认已经安装 JDK 17 或更高版本。
  pause
)
