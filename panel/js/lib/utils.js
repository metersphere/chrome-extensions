/*
 * Copyright 2017 SideeX committers
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

/**
 * Remove all child nodes of a node.
 * @argument {Node} node - A node to remove all child nodes.
 */
function emptyNode(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

/**
 * Clone or cut child nodes of a node, and then append to another node.
 * @param {Node} dest - A node which child nodes should be appended to.
 * @param {Node} src - A node which is the source of child nodes.
 * @param {boolean} clone - Determine if child nodes should be cloned instead of moved.
 * @param {boolean} deep - If cloned, determine if descendants of child nodes should also be cloned.
 */
function appendChildNodes(dest, src, clone, deep) {
    if (clone) {
        let children = src.childNodes;
        for (let i = 0; i < children.length; i++) {
            dest.appendChild(children[i].cloneNode(deep));
        }
    } else {
        while(src.firstChild) {
            dest.appendChild(src.firstChild);
        }
    }
}

/**
 * Clear all child nodes of a node and clone or move child nodes from another node.
 * @param {Node} dest - A node which child nodes should be copied to.
 * @param {Node} src - A node which is the source of child nodes.
 * @param {boolean} clone - Determine if child nodes should be cloned instead of moved.
 * @param {boolean} deep - If cloned, determine if descendants of child nodes should also be cloned.
 */
function assignChildNodes(dest, src, clone, deep) {
    emptyNode(dest);
    appendChildNodes(dest, src, clone, deep);
}
