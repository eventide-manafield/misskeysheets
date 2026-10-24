@echo off
rem SPDX-FileCopyrightText: Noctemblith contributors
rem SPDX-License-Identifier: AGPL-3.0-only
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22+ is required. Install Node.js and retry.
  exit /b 1
)
node "%~dp0scripts\install.mjs" %*
exit /b %errorlevel%
