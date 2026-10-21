"""Bundle the Pixel Agents sprites this page uses into one JS object of data URIs.

Characters come from Pixel Agents (MIT), based on JIK-A-4's MetroCity pack (CC0).
Floor tiles are grayscale in the source and get colorized here.
"""
import base64, io, json, sys
from PIL import Image

SRC = '/home/claude/pablodelucca/pixel-agents/webview-ui/public/assets'

def uri(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()

def load(p):
    return Image.open(f'{SRC}/{p}').convert('RGBA')

assets = {}

# characters
for i in (0, 3, 5):
    assets[f'char{i}'] = uri(load(f'characters/char_{i}.png'))

# DeepSeek: char_1 with the hair recolored to whale blue
hair_map = {
    (126, 75, 41): (34, 52, 128),
    (190, 119, 67): (56, 92, 200),
    (227, 159, 90): (92, 132, 236),
    (241, 192, 132): (156, 186, 255),
}
c1 = load('characters/char_1.png'); px = c1.load()
for y in range(c1.height):
    for x in range(c1.width):
        r, g, b, a = px[x, y]
        if a and (r, g, b) in hair_map:
            px[x, y] = hair_map[(r, g, b)] + (a,)
assets['deep'] = uri(c1)

furniture = {
    'DESK_FRONT': 'DESK/DESK_FRONT', 'PC_OFF': 'PC/PC_FRONT_OFF', 'PC_ON_1': 'PC/PC_FRONT_ON_1',
    'PC_ON_2': 'PC/PC_FRONT_ON_2', 'PC_ON_3': 'PC/PC_FRONT_ON_3', 'PC_SIDE': 'PC/PC_SIDE',
    'CHAIR_FRONT': 'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT', 'CHAIR_BACK': 'CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK',
    'COFFEE': 'COFFEE/COFFEE', 'PLANT': 'PLANT/PLANT', 'PLANT_2': 'PLANT_2/PLANT_2',
    'LARGE_PLANT': 'LARGE_PLANT/LARGE_PLANT', 'DOUBLE_BOOKSHELF': 'DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF',
    'LARGE_PAINTING': 'LARGE_PAINTING/LARGE_PAINTING', 'CLOCK': 'CLOCK/CLOCK', 'WHITEBOARD': 'WHITEBOARD/WHITEBOARD',
    'SMALL_PAINTING': 'SMALL_PAINTING/SMALL_PAINTING', 'SMALL_PAINTING_2': 'SMALL_PAINTING_2/SMALL_PAINTING_2',
    'HANGING_PLANT': 'HANGING_PLANT/HANGING_PLANT', 'SOFA_FRONT': 'SOFA/SOFA_FRONT',
    'COFFEE_TABLE': 'COFFEE_TABLE/COFFEE_TABLE', 'SMALL_TABLE': 'SMALL_TABLE/SMALL_TABLE_FRONT',
    'CACTUS': 'CACTUS/CACTUS', 'BIN': 'BIN/BIN', 'WOODEN_CHAIR_SIDE': 'WOODEN_CHAIR/WOODEN_CHAIR_SIDE',
}
for k, p in furniture.items():
    assets[k] = uri(load(f'furniture/{p}.png'))

assets['dog'] = uri(load('pets/claudio/pet.png'))

def colorize(tile, base):
    t = load(f'floors/{tile}.png'); px = t.load()
    lums = [px[x, y][0] / 255 for y in range(t.height) for x in range(t.width)]
    mean = sum(lums) / len(lums) or 1
    out = Image.new('RGBA', t.size); o = out.load()
    for y in range(t.height):
        for x in range(t.width):
            f = 0.82 + 0.36 * (px[x, y][0] / 255 / mean - 1) * 1.6
            o[x, y] = tuple(max(0, min(255, int(c * f))) for c in base) + (255,)
    return out

assets['floor'] = uri(colorize('floor_4', (182, 136, 92)))
assets['rug'] = uri(colorize('floor_1', (196, 92, 66)))
assets['lounge'] = uri(colorize('floor_5', (112, 128, 186)))

out = sys.argv[1]
with open(out, 'w') as f:
    f.write('const A=' + json.dumps(assets) + ';')
print(len(assets), 'assets', sum(len(v) for v in assets.values()) // 1024, 'KB')
