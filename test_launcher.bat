@echo off
PortableApps.comLauncher\PortableApps.comLauncherGenerator.exe %CD%\PolyMCPortable
del PolyMCPortable\Data\debug.log
start %CD%\PolyMCPortable\PolyMCPortable.exe
