@echo off
chcp 65001 >nul
title 一目个人财务管理与可视化看板

if exist "deliverables\yimu-finance-dashboard.jar" (
  echo 正在以 JAR 模式启动...
  echo 启动后请访问 http://127.0.0.1:4173/
  java -jar deliverables\yimu-finance-dashboard.jar
  if errorlevel 1 (
    echo.
    echo 启动失败，请确认已经安装 JDK 17 或更高版本。
    pause
  )
) else (
  echo 未找到 JAR 包，将以 Node 开发模式启动...
  echo 启动后请访问 http://127.0.0.1:4173/
  if not exist node_modules (
    echo 首次运行需要安装依赖，请稍候...
    call npm install
  )
  call npm start
  if errorlevel 1 (
    echo.
    echo 启动失败，请确认已经安装 Node.js 20 或更高版本。
    pause
  )
)
