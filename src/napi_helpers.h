#include <napi.h>
#include "string_cast.h"

template<typename T>
Napi::Value toNAPI(Napi::Env &env, const T &input);

template<typename T>
T fromNAPI(const Napi::Value &info);

template<typename T>
Napi::Value toNAPI(Napi::Env &env, const std::vector<T> &input) {
  Napi::Array result = Napi::Array::New(env, input.size());
  uint32_t index = 0;
  for (const auto &iter : input) {
    result.Set(index++, toNAPI(env, iter));
  }
  return result;
}

template<typename ... Args>
std::string format(const char *format, Args... args)
{
  int size = snprintf(nullptr, 0, format, args...) + 1;
  if (size <= 0) {
    return format;
  }

  std::unique_ptr<char[]> buf(new char[size]);
  snprintf(buf.get(), size, format, args...);
  return std::string(buf.get(), buf.get() + size - 1);
}


template<>
Napi::Value toNAPI<std::string>(Napi::Env &env, const std::string &input) {
  return Napi::String::From(env, input);
}

template<typename T>
std::vector<T> fromNAPIArr(const Napi::Value &info) {
  if (!info.IsArray()) {
    throw std::runtime_error("expected array");
  }

  Napi::Object arr = info.ToObject();

  std::vector<T> res;
  for (uint32_t i = 0; ; ++i) {
    if (arr.Get(i).IsUndefined()) {
      break;
    }
    res.push_back(fromNAPI<T>(arr.Get(i)));
  }
  return res;
}

template<>
std::string fromNAPI(const Napi::Value &info) {
  return info.ToString().Utf8Value();
}

template<>
std::wstring fromNAPI(const Napi::Value &info) {
  return u8Tou16(info.ToString().Utf8Value());
}

template<>
int fromNAPI(const Napi::Value &info) {
  return info.ToNumber().Int32Value();
}

template<>
bool fromNAPI(const Napi::Value &info) {
  return info.ToBoolean();
}

template<typename T> struct Tag {};

/**
 * convert function arguments to C++ types, verifying they have the expected type
 */
template<typename T> void convertArg(Tag<T>, T &out, const Napi::CallbackInfo &info, int idx);

template<>
void convertArg<std::string>(Tag<std::string>, std::string &out, const Napi::CallbackInfo &info, int idx) {
  if (!info[idx].IsString()) {
    throw Napi::Error::New(info.Env(), format("parameter %d expected to be a string", idx + 1));
  }
  out = fromNAPI<std::string>(info[idx]);
}

template<>
void convertArg<std::wstring>(Tag<std::wstring>, std::wstring &out, const Napi::CallbackInfo &info, int idx) {
  if (!info[idx].IsString()) {
    throw Napi::Error::New(info.Env(), format("parameter %d expected to be a string", idx + 1));
  }
  out = fromNAPI<std::wstring>(info[idx]);
}

template<>
void convertArg<bool>(Tag<bool>, bool &out, const Napi::CallbackInfo &info, int idx) {
  if (!info[idx].IsBoolean()) {
    throw Napi::Error::New(info.Env(), format("parameter %d expected to be a boolean", idx + 1));
  }
  out = fromNAPI<bool>(info[idx]);
}

template<>
void convertArg<int>(Tag<int>, int &out, const Napi::CallbackInfo &info, int idx) {
  if (!info[idx].IsNumber()) {
    throw Napi::Error::New(info.Env(), format("parameter %d expected to be an integer", idx + 1));
  }
  out = fromNAPI<int>(info[idx]);
}

template<typename T>
void convertArg(Tag<std::vector<T>>, std::vector<T> &out, const Napi::CallbackInfo &info, int idx) {
  if (!info[idx].IsArray()) {
    throw Napi::Error::New(info.Env(), format("parameter %d expected to be an array", idx + 1));
  }

  out = fromNAPIArr<T>(info[idx]);
}

template<size_t I = 0, typename T0, typename... TR>
void convertRec(const Napi::CallbackInfo &info, int requiredCount, T0 &out, TR &... rest) {
  if ((requiredCount > I) || (info.Length() > I)) {
    convertArg(Tag<T0>(), out, info, I);
  }
  if constexpr (sizeof...(rest) > 0) {
    convertRec<I + 1>(info, requiredCount, rest...);
  }
}

template<int requiredCount = 0, typename... T>
void unpackArgs(const Napi::CallbackInfo &info, T&... t) {
  const std::size_t count = requiredCount > 0 ? requiredCount : sizeof...(T);
  if (info.Length() < count) {
    throw Napi::Error::New(info.Env(), format("invalid number of parameters, expected %d", count));
  }

  convertRec(info, requiredCount, t...);
}
