#pragma once

#include <string>
#include <v8.h>

enum class CodePage {
  LOCAL,
  LATIN1,
  UTF8
};

uint32_t windowsCP(CodePage codePage);

std::wstring toWC(const char * const &source, CodePage codePage, size_t sourceLength);

std::string toMB(const wchar_t * const &source, CodePage codePage, size_t sourceLength);

v8::Local<v8::String> operator "" _n(const char *input, size_t);
