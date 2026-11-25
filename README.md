# 薄计划

12 周减脂留线条。每天告诉你练什么、外卖点什么，按周根据体重自动调整。

- 安卓独立 App（Capacitor + 本地内置页面，离线可用）
- 网页 PWA（可添加到桌面）
- 7 天全徒手训练 + 外卖清单
- 体重、腰围、训练、饮食、喝水打卡
- 周复盘自动调整热量上限和步数

## 下载安卓 App

打开 [Releases](https://github.com/j2903318669-ctrl/thin-plan/releases/latest)，下载 `thin-plan.apk`。

首次安装时 Android 会提示“未知来源”，需要在浏览器或文件管理器里允许安装未知应用。APK 使用 debug 签名，适合自己侧载，不是应用商店版本。

## 网页版

https://j2903318669-ctrl.github.io/thin-plan/

Android Chrome 菜单里选“安装应用”；iPhone Safari 用分享按钮“添加到主屏幕”。

## 本地开发

```bash
npm install
npx cap sync android
npx cap open android   # 需要本机 Android Studio
```

网页文件在 `www/`，改完执行 `npx cap sync android` 同步进原生工程。

## 云端构建

推送到 `main` 后，GitHub Actions 会：

1. 用 JDK 21 + Android SDK 36 构建 debug APK；
2. 发布到 `v1.0.0` Release；
3. 把 `www/` 部署到 GitHub Pages。

构建配置在 `.github/workflows/build.yml`。

## 数据

所有记录只保存在手机本地（WebView localStorage / 浏览器 localStorage），不上传服务器。换手机前用“数据 → 导出 JSON”备份。
