@echo off
setlocal enabledelayedexpansion

set URL=https://anime-quote-studio.vercel.app/api/emotion-tagger?limit=200
set HEADER=x-ingest-key: 0dda1ccc93f6e486a04a6d6e6b0388a746ec317874c7c2cad98d09b854e39c98

for /l %%i in (1,1,100) do (
  echo Run %%i...
  curl -s -X POST "%URL%" -H "%HEADER%" > result.json

  rem Read the response into a variable
  set /p RESPONSE=<result.json
  echo Response: !RESPONSE!

  rem Check if "labeled_total":0 is present
  echo !RESPONSE! | find "\"labeled_total\":0" >nul
  if !errorlevel! == 0 (
    echo.
    echo All quotes processed or none left to tag. Stopping.
    del result.json
    goto :end
  )

  timeout /t 20 >nul
)

:end
echo Finished runs.
del result.json >nul 2>&1
endlocal
