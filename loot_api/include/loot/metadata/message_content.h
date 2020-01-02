/*  LOOT

    A load order optimisation tool for Oblivion, Skyrim, Fallout 3 and
    Fallout: New Vegas.

    Copyright (C) 2012-2016    WrinklyNinja

    This file is part of LOOT.

    LOOT is free software: you can redistribute
    it and/or modify it under the terms of the GNU General Public License
    as published by the Free Software Foundation, either version 3 of
    the License, or (at your option) any later version.

    LOOT is distributed in the hope that it will
    be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with LOOT.  If not, see
    <https://www.gnu.org/licenses/>.
    */
#ifndef LOOT_METADATA_MESSAGE_CONTENT
#define LOOT_METADATA_MESSAGE_CONTENT

#include <string>
#include <vector>

#include "loot/api_decorator.h"

namespace loot {
/**
 * Represents a message's localised text content.
 */
class MessageContent {
public:
  /**
   * The code for the default language assumed for message content, which is
   * English.
   */
  LOOT_API static const std::string defaultLanguage;

  /**
   * Construct a MessageContent object with an empty English message string.
   * @return A MessageContent object.
   */
  LOOT_API explicit MessageContent();

  /**
   * Construct a Message object with the given text in the given language.
   * @param  text
   *         The message text.
   * @param  language
   *         The language that the message is written in.
   * @return A MessageContent object.
   */
  LOOT_API explicit MessageContent(const std::string& text,
                          const std::string& language = defaultLanguage);

  /**
   * Get the message text.
   * @return A string containing the message text.
   */
  LOOT_API std::string GetText() const;

  /**
   * Get the message language.
   * @return A code representing the language that the message is written in.
   */
  LOOT_API std::string GetLanguage() const;

  /**
   * A less-than operator implemented with no semantics so that MessageContent
   * objects can be stored in sets.
   * @returns True if this MessageContent's text is lexicographically less than
   *          the given MessageContent's text, false otherwise.
   */
  LOOT_API bool operator<(const MessageContent& rhs) const;

  /**
   * Check if two MessageContent objects are equal by comparing their texts.
   * @returns True if the texts are equal, false otherwise.
   */
  LOOT_API bool operator==(const MessageContent& rhs) const;

  /**
   * Choose a MessageContent object from a vector given a language.
   * @param  content
   *         The MessageContent objects to choose between.
   * @param  language
   *         The language code for the preferred language to select. If no
   *         message in the preferred language is present, the English
   *         MessageContent will be returned.
   * @return A MessageContent object. If the given vector is empty, a
   *         default-constructed MessageContent is returned.
   */
  LOOT_API static MessageContent Choose(
      const std::vector<MessageContent> content,
      const std::string& language);

private:
  std::string text_;
  std::string language_;
};
}

#endif
