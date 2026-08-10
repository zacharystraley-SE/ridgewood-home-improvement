CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('cabinetry','island','countertops','backsplash','flooring','walls')),
  name TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  swatch TEXT NOT NULL,
  layer_url TEXT NOT NULL,
  edge_layer_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  sort_order INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_material_order ON materials(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_material_category ON materials(category, enabled, sort_order);

CREATE TRIGGER IF NOT EXISTS materials_max_ten
BEFORE INSERT ON materials
WHEN (SELECT COUNT(*) FROM materials WHERE category = NEW.category) >= 10
BEGIN
  SELECT RAISE(ABORT, 'category limit reached');
END;

CREATE TABLE IF NOT EXISTS manager_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS manager_login_attempts (
  ip TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  failures INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public_submission_limits (
  ip TEXT NOT NULL,
  action TEXT NOT NULL,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, action)
);

CREATE TABLE IF NOT EXISTS kitchen_submissions (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO materials VALUES
('linen','cabinetry','Stone Putty','Soft mineral matte','#a49b8f','kitchen-renders/compositor/cabinetry/linen.webp',NULL,1,10,unixepoch()*1000,unixepoch()*1000),
('sage','cabinetry','Garden Sage','Muted mineral paint','#7d887a','kitchen-renders/compositor/cabinetry/sage.webp',NULL,1,20,unixepoch()*1000,unixepoch()*1000),
('walnut','cabinetry','Smoked Walnut','Linear wood grain','#6b5345','kitchen-renders/compositor/cabinetry/walnut.webp',NULL,1,30,unixepoch()*1000,unixepoch()*1000),
('ink','cabinetry','Inkwell','Original scene · deep satin paint','#273235','kitchen-renders/compositor/cabinetry/ink.webp',NULL,1,40,unixepoch()*1000,unixepoch()*1000),
('charcoal','island','Charcoal','Original scene · architectural matte','#303a3a','kitchen-renders/compositor/island/charcoal.webp',NULL,1,10,unixepoch()*1000,unixepoch()*1000),
('white-oak','island','White Oak','Natural rift grain','#b99a73','kitchen-renders/compositor/island/white-oak.webp',NULL,1,20,unixepoch()*1000,unixepoch()*1000),
('clay','island','Fired Clay','Warm hand-painted finish','#9a604b','kitchen-renders/compositor/island/clay.webp',NULL,1,30,unixepoch()*1000,unixepoch()*1000),
('moss','island','Deep Moss','Rich satin paint','#42534b','kitchen-renders/compositor/island/moss.webp',NULL,1,40,unixepoch()*1000,unixepoch()*1000),
('soft-quartz','countertops','Soft Quartz','Original scene · quiet warm white','#e8e2d8','kitchen-renders/compositor/countertops/soft-quartz.webp',NULL,1,10,unixepoch()*1000,unixepoch()*1000),
('calacatta','countertops','Calacatta Mist','Wide soft veining','#ece9e1','kitchen-renders/compositor/countertops/calacatta.webp',NULL,1,20,unixepoch()*1000,unixepoch()*1000),
('soapstone','countertops','Night Soapstone','Low-contrast charcoal','#343a39','kitchen-renders/compositor/countertops/soapstone.webp',NULL,1,30,unixepoch()*1000,unixepoch()*1000),
('travertine','countertops','Warm Travertine','Fine linear texture','#c9b495','kitchen-renders/compositor/countertops/travertine.webp',NULL,1,40,unixepoch()*1000,unixepoch()*1000),
('slab','backsplash','Marble Field','Original scene · honed marble tile','#dad4c8','kitchen-renders/compositor/backsplash/slab.webp',NULL,1,10,unixepoch()*1000,unixepoch()*1000),
('zellige','backsplash','Bone Zellige','Handmade square tile','#d9d2c4','kitchen-renders/compositor/backsplash/zellige.webp',NULL,1,20,unixepoch()*1000,unixepoch()*1000),
('terracotta','backsplash','Terracotta Grid','Warm geometric tile','#aa6952','kitchen-renders/compositor/backsplash/terracotta.webp',NULL,1,30,unixepoch()*1000,unixepoch()*1000),
('sage-tile','backsplash','Sea Glass','Soft gloss subway','#789087','kitchen-renders/compositor/backsplash/sage-tile.webp',NULL,1,40,unixepoch()*1000,unixepoch()*1000),
('natural-oak','flooring','Natural Oak','Original scene · wide plank, matte','#ad906c','kitchen-renders/compositor/flooring/natural-oak.webp','kitchen-renders/compositor/flooring/edge-natural-oak.webp',1,10,unixepoch()*1000,unixepoch()*1000),
('pale-stone','flooring','Pale Limestone','Large-format honed tile','#c8c1b3','kitchen-renders/compositor/flooring/pale-stone.webp','kitchen-renders/compositor/flooring/edge-pale-stone.webp',1,20,unixepoch()*1000,unixepoch()*1000),
('walnut-floor','flooring','Heritage Walnut','Deep natural plank','#5d4739','kitchen-renders/compositor/flooring/walnut-floor.webp','kitchen-renders/compositor/flooring/edge-walnut-floor.webp',1,30,unixepoch()*1000,unixepoch()*1000),
('warm-concrete','flooring','Warm Concrete','Seamless mineral finish','#9d9588','kitchen-renders/compositor/flooring/warm-concrete.webp','kitchen-renders/compositor/flooring/edge-warm-concrete.webp',1,40,unixepoch()*1000,unixepoch()*1000),
('plaster','walls','Plaster White','Original scene · warm and luminous','#e4dfd3','kitchen-renders/compositor/walls/plaster.webp',NULL,1,10,unixepoch()*1000,unixepoch()*1000),
('greige','walls','Mushroom','Balanced warm greige','#b6aa98','kitchen-renders/compositor/walls/greige.webp',NULL,1,20,unixepoch()*1000,unixepoch()*1000),
('olive','walls','Silver Olive','Muted botanical tone','#8e927e','kitchen-renders/compositor/walls/olive.webp',NULL,1,30,unixepoch()*1000,unixepoch()*1000),
('clay-wall','walls','Pale Clay','Soft mineral blush','#c8a28f','kitchen-renders/compositor/walls/clay-wall.webp',NULL,1,40,unixepoch()*1000,unixepoch()*1000);
