@echo off
PortableApps.comLauncher\PortableApps.comLauncherGenerator.exe %CD%\PrismLauncherPortable
del PrismLauncherPortable\Data\debug.log
start %CD%\PrismLauncherPortable\PrismLauncherPortable.exe
