#pragma once


#ifdef WIN32
#include <windows.h>
#endif // WIN32
#include <exception>
#include <napi.h>
#include <loot/api.h>

Napi::Error ErrnoException(Napi::Env &env
                           , unsigned long lastError
                           , const char *func = nullptr
                           , const char* path = nullptr);
Napi::Error ExcWrap(Napi::Env &env, const char *func, const std::exception &e);

Napi::Error UnsupportedGame(Napi::Env &env);

Napi::Error BusyException(Napi::Env &env);

Napi::Error CyclicalInteractionException(Napi::Env &env, loot::CyclicInteractionError &err);

Napi::Error InvalidParameter(Napi::Env &env, const char *func, const char *arg, const char *value);

Napi::Error LOOTError(Napi::Env &env, const char *func, const char *what);



