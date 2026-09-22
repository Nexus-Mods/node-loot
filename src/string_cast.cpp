#include "string_cast.h"

#ifdef _WIN32

#define WIN32_LEAN_AND_MEAN
#define _WINSOCKAPI_
#include <windows.h>

#include <stdexcept>

uint32_t windowsCP(CodePage codePage)
{
  switch (codePage) {
  case CodePage::LOCAL:  return CP_ACP;
  case CodePage::UTF8:   return CP_UTF8;
  case CodePage::LATIN1: return 850;
  }
  // this should not be possible in practice
  throw std::runtime_error("unsupported codePage");
}

std::string toMB(const wchar_t * const & source, CodePage codePage, size_t sourceLength) {
  std::string result;

  if (sourceLength == (std::numeric_limits<size_t>::max)()) {
    sourceLength = wcslen(source);
  }

  if (sourceLength > 0) {
    // use utf8 or local 8-bit encoding depending on user choice
    UINT cp = windowsCP(codePage);
    // preflight to find out the required buffer size
    int outLength = WideCharToMultiByte(cp, 0, source, static_cast<int>(sourceLength),
      nullptr, 0, nullptr, nullptr);
    if (outLength == 0) {
      throw std::runtime_error("string conversion failed");
    }
    result.resize(outLength);
    outLength = WideCharToMultiByte(cp, 0, source, static_cast<int>(sourceLength),
      &result[0], outLength, nullptr, nullptr);
    if (outLength == 0) {
      throw std::runtime_error("string conversion failed");
    }
    // fix output string length (i.e. in case of unconvertible characters
    while (result[outLength - 1] == L'\0') {
      result.resize(--outLength);
    }
  }

  return result;
}

#endif
