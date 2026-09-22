#pragma once

#include <string>
#include <v8.h>

enum class CodePage {
  LOCAL,
  LATIN1,
  UTF8
};

#ifdef _WIN32
uint32_t windowsCP(CodePage codePage);

std::string toMB(const wchar_t * const &source, CodePage codePage, size_t sourceLength);
#endif
