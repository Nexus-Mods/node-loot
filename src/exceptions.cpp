#include "exceptions.h"
#include "string_cast.h"

std::wstring strerror(DWORD errorno) {
  wchar_t *errmsg = nullptr;

  LCID lcid;
  GetLocaleInfoEx(L"en-US", LOCALE_RETURN_NUMBER | LOCALE_ILANGUAGE, reinterpret_cast<LPWSTR>(&lcid), sizeof(lcid));

  FormatMessageW(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM |
    FORMAT_MESSAGE_IGNORE_INSERTS, nullptr, errorno,
    lcid, (LPWSTR)&errmsg, 0, nullptr);

  if (errmsg) {
    for (int i = (wcslen(errmsg) - 1);
      (i >= 0) && ((errmsg[i] == '\n') || (errmsg[i] == '\r'));
      --i) {
      errmsg[i] = '\0';
    }

    return errmsg;
  }
  else {
    return L"Unknown error";
  }
}

const char * translateCode(DWORD err) {
  switch (err) {
  case ERROR_USER_MAPPED_FILE: return "EBUSY";
  default: return uv_err_name(uv_translate_sys_error(err));
  }
}

void setNodeErrorCode(v8::Local<v8::Context> context, v8::Local<v8::Object> err, DWORD errCode) {
  if (!err->Has(context, "code"_n).FromMaybe(false)) {
    err->Set(context, "code"_n, Nan::New(translateCode(errCode)).ToLocalChecked());
  }
}

v8::Local<v8::Value> WinApiException(v8::Local<v8::Context> context, DWORD lastError, const char * func, const char * path) {

  std::wstring errStr = strerror(lastError);
  std::string err = toMB(errStr.c_str(), CodePage::UTF8, errStr.size());
  v8::Local<v8::Value> res = node::WinapiErrnoException(v8::Isolate::GetCurrent(), lastError, func, err.c_str(), path);
  setNodeErrorCode(context, res->ToObject(), lastError);
  return res;
}
