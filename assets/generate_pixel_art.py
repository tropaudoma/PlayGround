#!/usr/bin/env python3
"""Generate the hand-authored low-resolution pixel-art assets used by the game."""
from pathlib import Path
import struct, zlib

OUT = Path(__file__).parent / 'pixel'
OUT.mkdir(parents=True, exist_ok=True)
TRANSPARENT = (0, 0, 0, 0)

class Image:
    def __init__(self, w, h, color=TRANSPARENT):
        self.w, self.h = w, h
        self.p = [color] * (w * h)
    def rect(self, x, y, w, h, color):
        for yy in range(max(0, y), min(self.h, y+h)):
            for xx in range(max(0, x), min(self.w, x+w)):
                self.p[yy*self.w+xx] = color
    def pixel(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h: self.p[y*self.w+x] = color
    def polygon(self, points, color):
        ymin=max(0,min(y for _,y in points)); ymax=min(self.h-1,max(y for _,y in points))
        for y in range(ymin,ymax+1):
            hits=[]
            for i,(x1,y1) in enumerate(points):
                x2,y2=points[(i+1)%len(points)]
                if y1==y2: continue
                if min(y1,y2)<=y<max(y1,y2): hits.append(round(x1+(y-y1)*(x2-x1)/(y2-y1)))
            hits.sort()
            for a,b in zip(hits[::2],hits[1::2]): self.rect(a,y,b-a+1,1,color)
    def line(self, x1, y1, x2, y2, color, width=1):
        dx,dy=abs(x2-x1),abs(y2-y1); sx=1 if x1<x2 else -1; sy=1 if y1<y2 else -1; err=dx-dy
        while True:
            self.rect(x1-width//2,y1-width//2,width,width,color)
            if x1==x2 and y1==y2: break
            e=2*err
            if e>-dy: err-=dy; x1+=sx
            if e<dx: err+=dx; y1+=sy
    def ellipse(self, x, y, w, h, color):
        for yy in range(y,y+h):
            for xx in range(x,x+w):
                if ((xx-x-w/2)/(w/2))**2+((yy-y-h/2)/(h/2))**2<=1: self.pixel(xx,yy,color)
    def save(self, path):
        raw=b''.join(b'\0'+bytes(c for px in self.p[y*self.w:(y+1)*self.w] for c in px) for y in range(self.h))
        def chunk(tag, data): return struct.pack('!I',len(data))+tag+data+struct.pack('!I',zlib.crc32(tag+data)&0xffffffff)
        Path(path).write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',self.w,self.h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))

# 210 x 90 painted alley backdrop. Each block is intentionally authored at game resolution.
bg=Image(210,90)
bg.rect(0,0,210,90,(22,30,48,255)); bg.rect(0,0,210,13,(28,37,57,255))
# distant rooftop silhouettes and tiny lit windows
bg.rect(0,7,30,17,(18,27,42,255)); bg.rect(4,3,7,17,(18,27,42,255)); bg.rect(177,4,33,22,(17,25,40,255)); bg.rect(183,0,8,24,(17,25,40,255))
for x,y in [(8,8),(21,13),(185,10),(198,7)]: bg.rect(x,y,2,3,(218,166,83,255))
# overhead cable and warm lamp
bg.line(0,7,67,9,(9,16,27,255),1); bg.line(138,6,210,4,(9,16,27,255),1)
bg.rect(24,7,2,5,(89,66,59,255)); bg.rect(21,11,8,2,(139,94,58,255)); bg.rect(23,13,4,3,(255,197,91,255)); bg.rect(20,16,10,1,(221,150,69,255))
# brick wall
bg.rect(7,14,192,58,(89,65,58,255)); bg.rect(8,15,190,55,(151,99,69,255)); bg.rect(8,15,190,3,(190,131,84,255))
for row,y in enumerate(range(20,71,7)):
    bg.rect(8,y,190,1,(106,71,59,255)); off=0 if row%2 else 8
    for x in range(8+off,199,16):
        bg.rect(x,y-5,1,6,(110,73,58,255)); bg.rect(x+1,y-5,1,1,(174,115,75,255))
# wall weathering, small moss patches
for x,y,w in [(13,29,8),(182,22,10),(34,63,5),(164,55,7),(190,43,4)]: bg.rect(x,y,w,1,(125,92,68,255))
bg.rect(8,67,190,5,(112,75,55,255)); bg.rect(8,67,190,1,(202,141,83,255))
# left drain pipe and right conduit
bg.rect(16,16,4,54,(55,57,60,255)); bg.rect(17,16,1,52,(126,119,99,255)); bg.rect(14,24,7,2,(74,74,68,255)); bg.rect(14,59,7,2,(74,74,68,255))
bg.rect(193,15,3,53,(65,68,66,255)); bg.rect(192,24,5,2,(113,107,83,255)); bg.rect(192,59,5,2,(113,107,83,255))
# Leave the masonry blank: completed jobs paint persistent pixel-art murals at runtime.
# The pipes, brick seams and weathering remain visible beneath every new design.
# sidewalk curb, paving, puddles
bg.rect(0,72,210,3,(73,73,75,255)); bg.rect(0,72,210,1,(186,143,89,255)); bg.rect(0,75,210,15,(40,47,56,255))
for x in range(0,210,16): bg.rect(x,80,10,1,(70,73,73,255)); bg.rect(x+10,84,1,6,(70,73,73,255))
bg.rect(7,86,26,1,(48,123,128,255)); bg.rect(11,87,11,1,(45,76,108,255))
# low crates, bottles, paint cans and litter props
bg.rect(24,66,13,6,(54,49,50,255)); bg.rect(25,67,11,1,(116,83,56,255)); bg.rect(28,69,2,2,(39,38,44,255))
for x,c in [(41,(244,159,68,255)),(48,(76,181,190,255)),(171,(231,100,92,255)),(179,(180,119,187,255)),(187,(239,183,77,255))]:
    bg.rect(x,67,5,6,(38,40,47,255)); bg.rect(x,68,5,4,c); bg.rect(x+1,66,3,2,(215,207,172,255)); bg.rect(x+1,70,3,1,(49,53,56,255))
bg.rect(157,69,6,2,(207,177,106,255)); bg.rect(160,68,2,1,(228,216,174,255))
bg.save(OUT/'alley.png')

# Palette-coded pixel character: 24x32. Four independent animation frames.
# P=outline, H=hair, S=skin, L=light, J=jacket, A=accent, T=trousers, B=boots, C=can, M=metal, G=glow.
def artist(frame):
    im=Image(24,32)
    P=(34,34,45,255); H=(48,39,42,255); S=(199,128,87,255); L=(244,190,139,255)
    J=(62,119,117,255); J2=(39,77,86,255); A=(239,164,76,255); T=(48,54,69,255); T2=(67,72,82,255); B=(235,190,111,255); C=(225,91,78,255); M=(204,205,183,255); G=(104,223,198,255)
    # cast shadow, shoes and animated stride
    im.ellipse(2,29,20,2,(20,25,35,180)); im.rect(5,27,5,3,T); im.rect(14,27,5,3,T)
    if frame==0: im.rect(4,26,6,2,B); im.rect(14,26,6,2,B); im.rect(5,25,4,3,T); im.rect(15,27,4,2,T2)
    elif frame==1: im.rect(3,27,6,2,B); im.rect(15,26,6,2,B); im.rect(4,25,4,3,T2); im.rect(15,25,4,3,T)
    else: im.rect(4,27,6,2,B); im.rect(14,27,6,2,B); im.rect(5,25,4,3,T); im.rect(15,25,4,3,T2)
    # trouser silhouette and cuff
    im.rect(5,20,6,7,T); im.rect(13,20,6,7,T); im.rect(4,25,7,2,T2); im.rect(13,25,7,2,T2)
    # jacket torso, hood, pockets and seam
    im.rect(4,12,16,10,P); im.rect(5,12,14,9,J); im.rect(6,11,12,2,J2); im.rect(6,20,12,2,J2)
    im.rect(11,13,2,7,(88,151,139,255)); im.rect(6,15,4,4,J2); im.rect(14,15,3,4,J2); im.rect(7,16,2,2,A); im.rect(15,16,1,2,A)
    # neck and head with hair/cap
    im.rect(9,9,6,4,S); im.rect(8,4,9,7,P); im.rect(9,5,7,6,S); im.rect(9,5,2,5,L)
    im.rect(8,3,10,3,H); im.rect(7,5,3,2,H); im.rect(9,2,7,2,(80,54,47,255)); im.rect(8,1,9,2,A); im.rect(7,2,12,1,P)
    im.rect(10,7,1,1,P); im.rect(14,7,1,1,P); im.rect(12,9,2,1,(119,67,57,255)); im.rect(10,10,4,1,L)
    # backpack and straps
    im.rect(3,13,3,7,(153,74,75,255)); im.rect(3,14,2,4,(194,92,77,255)); im.rect(6,12,2,7,A)
    # left bent arm
    im.rect(3,13,3,6,J); im.rect(2,16,3,4,J2); im.rect(2,19,3,2,S)
    if frame in (2,3):
        # extended working arm, changing elbow and wrist on the two paint frames
        if frame==2:
            im.rect(18,13,3,3,J); im.rect(19,12,3,2,J2); im.rect(21,11,2,2,S)
            im.rect(21,7,3,6,P); im.rect(22,8,2,4,C); im.rect(22,9,1,2,(255,139,91,255)); im.rect(21,6,3,1,M); im.rect(21,13,3,1,M)
            im.rect(19,7,2,1,G); im.pixel(18,6,A)
        else:
            im.rect(18,13,3,3,J); im.rect(20,12,2,2,J2); im.rect(21,11,2,2,S)
            im.rect(21,7,3,6,P); im.rect(22,8,2,4,(79,151,193,255)); im.rect(22,9,1,2,(139,218,244,255)); im.rect(21,6,3,1,M); im.rect(21,13,3,1,M)
            im.rect(20,7,2,1,G); im.pixel(19,6,A)
    else:
        # relaxed carrying arm and spray can at hip
        im.rect(18,13,3,5,J); im.rect(19,17,2,3,S); im.rect(20,18,3,7,P); im.rect(21,19,2,5,C); im.rect(21,19,2,1,M); im.rect(21,23,2,1,M)
    # chest badge
    im.rect(10,15,3,3,A); im.pixel(11,16,(255,222,128,255)); im.pixel(12,17,J2)
    return im

# Assemble four character frames in a single PNG sprite atlas and standalone crisp portraits for interface.
atlas=Image(144,64)
for i in range(4):
    spr=artist(i)
    for y in range(32):
        for x in range(24): atlas.pixel(i*24+x,y,spr.p[y*24+x])
for i in range(6):
    # six bespoke merge-tool icons in individual 16x16 cells
    im=Image(16,16); dark=(38,38,46,255); steel=(198,203,185,255); shadow=(56,48,47,255)
    colors=[(220,158,78,255),(90,157,184,255),(224,104,83,255),(111,166,115,255),(225,185,79,255),(175,124,184,255)]
    c=colors[i]
    if i==0: # carpenter pencil
        im.polygon([(3,12),(11,4),(14,7),(6,15)],dark); im.polygon([(4,11),(11,4),(13,6),(6,13)],c); im.polygon([(3,12),(6,13),(4,15)],steel); im.rect(10,4,2,2,(255,221,145,255))
    elif i in (1,2): # marker pens
        im.polygon([(5,13),(7,3),(11,3),(12,13),(10,15),(6,15)],dark); im.rect(7,4,4,8,c); im.rect(7,3,4,2,steel); im.rect(8,12,2,3,shadow); im.pixel(9,5,(255,225,172,255))
    elif i in (3,4): # aerosol can with nozzle
        im.rect(4,5,9,10,dark); im.rect(5,6,7,8,c); im.rect(6,3,5,3,steel); im.rect(7,2,3,2,shadow); im.rect(6,8,5,2,(241,226,194,255)); im.rect(7,11,3,2,shadow); im.pixel(13,3,(117,225,216,255))
    else: # artist's hard case
        im.rect(2,6,13,9,dark); im.rect(3,7,11,7,c); im.rect(6,4,5,3,dark); im.rect(7,5,3,2,steel); im.rect(7,10,4,2,(245,207,137,255)); im.rect(4,8,2,4,steel); im.rect(12,8,1,4,steel)
    for y in range(16):
        for x in range(16): atlas.pixel(i*16+x,32+y,im.p[y*16+x])
    icon=Image(16,16)
    for y in range(16):
        for x in range(16): icon.pixel(x,y,im.p[y*16+x])
    icon.save(OUT/f'tool-{i+1}.png')
# Add dedicated workshop props to atlas row 48: sparkle and reward coin.
for x,y,c in [(100,52,(255,220,117,255)),(108,53,(103,223,198,255)),(116,51,(230,112,119,255))]:
    atlas.rect(x+2,y-2,2,6,c); atlas.rect(x,y,6,2,c)
atlas.ellipse(126,49,12,12,(80,54,35,255)); atlas.ellipse(127,48,10,10,(245,194,79,255)); atlas.rect(130,50,3,6,(255,226,129,255)); atlas.rect(129,51,5,1,(183,126,46,255))
atlas.save(OUT/'sprites.png')
print('Generated', OUT)
