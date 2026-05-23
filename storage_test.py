# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *


class Contract(gl.Contract):
    total: u256
    items: TreeMap[u256, str]

    def __init__(self):
        self.total = u256(0)

    @gl.public.write
    def set_item(self, value: str) -> int:
        idx = int(self.total)
        self.items[u256(idx)] = value
        self.total = u256(idx + 1)
        return idx

    @gl.public.view
    def get_item(self, idx: int) -> str:
        return self.items[u256(idx)]

    @gl.public.view
    def get_total(self) -> int:
        return int(self.total)
