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

#ifndef LOOT_EXCEPTION_CYCLIC_INTERACTION_ERROR
#define LOOT_EXCEPTION_CYCLIC_INTERACTION_ERROR

#include <stdexcept>
#include <vector>

#include "loot/api_decorator.h"
#include "loot/vertex.h"

namespace loot {
/**
 * @brief An exception class thrown if a cyclic interaction is detected when
 *        sorting a load order.
 */
class CyclicInteractionError : public std::runtime_error {
public:
  /**
   * @brief Construct an exception detailing a plugin or group graph cycle.
   * @param cycle A representation of the cyclic path.
   */
  LOOT_API CyclicInteractionError(std::vector<Vertex> cycle);

  /**
   * @brief Get a representation of the cyclic path.
   * @details Each Vertex is the name of a graph element (plugin or group) and
   *          the type of the edge going to the next Vertex. The last Vertex
   *          has an edge going to the first Vertex.
   * @return A vector of Vertex elements representing the cyclic path.
   */
  LOOT_API std::vector<Vertex> GetCycle();

private:
  const std::vector<Vertex> cycle_;
};
}

#endif
