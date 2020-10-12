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

std::wstring u8Tou16(const std::string &input);
