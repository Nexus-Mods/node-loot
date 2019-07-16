#pragma once

#include <v8.h>
#include <nan.h>

#ifdef WIN32

static std::wstring strerror(DWORD errorno);

const char *translateCode(DWORD err);

void setNodeErrorCode(v8::Local<v8::Object> err, DWORD errCode);

v8::Local<v8::Value> WinApiException(DWORD lastError
                                     , const char *func = nullptr
                                     , const char* path = nullptr);

#endif // WIN32

