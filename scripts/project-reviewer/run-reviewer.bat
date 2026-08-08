@echo off
setlocal enabledelayedexpansion

set "PROJECT_PATH="
set "PENDING="

rem Parse -ProjectPath (value may contain quotes and spaces; quoted tokens stay together)
for %%A in (%*) do (
    set "TOKEN=%%~A"
    if defined PENDING (
        set "PROJECT_PATH=!TOKEN!"
        set "PENDING="
    ) else if /i "%%~A"=="-ProjectPath" (
        set "PENDING=1"
    )
)

if not defined PROJECT_PATH (
    echo [ERROR] -ProjectPath is required. Usage: run-reviewer.bat -ProjectPath ^<app dir^> [options]
    exit /b 2
)

set "NODE_EXE="

rem 1) nodejs.dir from the target app's local.properties (explicit, highest priority)
for /f "usebackq tokens=1,* delims==" %%L in (`findstr /i "nodejs.dir" "%PROJECT_PATH%\local.properties" 2^>nul`) do (
    if exist "%%M\node.exe" set "NODE_EXE=%%M\node.exe"
)

rem 2) Node bundled with DevEco Studio (5.x projects do not write nodejs.dir)
if not defined NODE_EXE for /d %%D in ("%ProgramFiles%\Huawei\DevEco Studio*") do (
    if exist "%%~D\DevEco Studio\tools\node\node.exe" set "NODE_EXE=%%~D\DevEco Studio\tools\node\node.exe"
    if not defined NODE_EXE if exist "%%~D\tools\node\node.exe" set "NODE_EXE=%%~D\tools\node\node.exe"
)
if not defined NODE_EXE for /d %%D in ("%ProgramFiles(x86)%\Huawei\DevEco Studio*") do (
    if exist "%%~D\DevEco Studio\tools\node\node.exe" set "NODE_EXE=%%~D\DevEco Studio\tools\node\node.exe"
    if not defined NODE_EXE if exist "%%~D\tools\node\node.exe" set "NODE_EXE=%%~D\tools\node\node.exe"
)
if not defined NODE_EXE for /d %%D in ("%LOCALAPPDATA%\Programs\Huawei\DevEco Studio*") do (
    if exist "%%~D\DevEco Studio\tools\node\node.exe" set "NODE_EXE=%%~D\DevEco Studio\tools\node\node.exe"
    if not defined NODE_EXE if exist "%%~D\tools\node\node.exe" set "NODE_EXE=%%~D\tools\node\node.exe"
)

rem 3) node on PATH
if not defined NODE_EXE (
    for /f "delims=" %%N in ('where node 2^>nul') do (
        if not defined NODE_EXE set "NODE_EXE=%%N"
    )
)

if not defined NODE_EXE (
    echo [ERROR] node.exe not found. Checked:
    echo         - nodejs.dir in "%PROJECT_PATH%\local.properties"
    echo         - DevEco Studio bundled node under "%ProgramFiles%\Huawei\DevEco Studio*"
    echo         - node on PATH
    exit /b 1
)

"%NODE_EXE%" "%~dp0cli.js" %*
exit /b %ERRORLEVEL%
