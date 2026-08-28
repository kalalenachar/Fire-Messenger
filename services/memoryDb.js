const mongoose = require("mongoose");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const StatusPost = require("../models/StatusPost");
const AudienceProfile = require("../models/AudienceProfile");
const UserFolder = require("../models/UserFolder");
const Report = require("../models/Report");

const store = {
  users: new Map(),
  chats: new Map(),
  messages: new Map(),
  statusPosts: new Map(),
  audienceProfiles: new Map(),
  userFolders: new Map(),
  reports: new Map(),
};

function seedInMemoryStore(defaultUsersList = [], initialChats = [], initialMessages = [], fireBotUser = null) {
  if (fireBotUser) store.users.set(fireBotUser._id, { ...fireBotUser });
  defaultUsersList.forEach((u) => store.users.set(u._id, { ...u }));
  initialChats.forEach((c) => store.chats.set(c._id, { ...c }));
  initialMessages.forEach((m) => store.messages.set(m._id, { ...m }));
  console.log(`🌱 In-Memory Storage Engine initialized with ${store.users.size} users, ${store.chats.size} chats, and ${store.messages.size} messages.`);
}

function matchesFilter(item, filter) {
  if (!item) return false;
  if (!filter || Object.keys(filter).length === 0) return true;

  if (filter.$or && Array.isArray(filter.$or)) {
    const orMatches = filter.$or.some((subFilter) => matchesFilter(item, subFilter));
    if (!orMatches) return false;
  }

  for (const [key, cond] of Object.entries(filter)) {
    if (key === "$or") continue;

    let value;
    if (key.includes(".")) {
      const parts = key.split(".");
      value = item;
      for (const p of parts) {
        if (Array.isArray(value)) {
          value = value.map((v) => v?.[p]).filter((v) => v !== undefined);
          break;
        }
        value = value?.[p];
      }
    } else {
      value = item[key];
    }

    if (cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof Date)) {
      if (cond.$ne !== undefined && value === cond.$ne) return false;
      if (cond.$in !== undefined && Array.isArray(cond.$in)) {
        if (Array.isArray(value)) {
          if (!value.some((v) => cond.$in.includes(v))) return false;
        } else if (!cond.$in.includes(value)) {
          return false;
        }
      }
      if (cond.$gt !== undefined) {
        const valDate = new Date(value).getTime();
        const condDate = new Date(cond.$gt).getTime();
        if (isNaN(valDate) || valDate <= condDate) return false;
      }
      if (cond.$regex !== undefined) {
        const reg = new RegExp(cond.$regex, cond.$options || "");
        if (!reg.test(String(value || ""))) return false;
      }
    } else {
      if (Array.isArray(value)) {
        if (!value.some((v) => v === cond || (typeof v === "object" && v?._id === cond))) return false;
      } else if (value !== cond) {
        return false;
      }
    }
  }

  return true;
}

function applyUpdate(item, update) {
  if (!item || !update) return item;
  let target = { ...item };

  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      if (k.includes(".$[") || k.includes(".")) {
        const baseKey = k.split(".")[0];
        if (Array.isArray(target[baseKey])) {
          const prop = k.split(".").pop();
          target[baseKey] = target[baseKey].map((u) => {
            if (typeof u === "object" && u !== null) return { ...u, [prop]: v };
            return u;
          });
        }
      } else {
        target[k] = v;
      }
    }
  }

  for (const [k, v] of Object.entries(update)) {
    if (k !== "$set" && k !== "$in" && !k.startsWith("$")) {
      target[k] = v;
    }
  }

  return target;
}

function wrapDoc(obj, collectionMap) {
  if (!obj) return null;
  const doc = { ...obj };

  Object.defineProperty(doc, "toObject", {
    value: function () {
      const copy = { ...this };
      delete copy.toObject;
      delete copy.save;
      delete copy.markModified;
      return copy;
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(doc, "markModified", {
    value: function () {},
    writable: true,
    configurable: true,
  });

  Object.defineProperty(doc, "save", {
    value: async function () {
      const clean = this.toObject();
      collectionMap.set(clean._id, clean);
      return wrapDoc(clean, collectionMap);
    },
    writable: true,
    configurable: true,
  });

  return doc;
}

class InMemoryQuery {
  constructor(data, collectionMap) {
    this._data = data;
    this._collectionMap = collectionMap;
  }

  sort(criteria) {
    if (Array.isArray(this._data) && criteria) {
      const field = Object.keys(criteria)[0];
      const dir = criteria[field];
      this._data.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];
        if (valA instanceof Date) valA = valA.getTime();
        if (valB instanceof Date) valB = valB.getTime();
        if (valA < valB) return dir === -1 ? 1 : -1;
        if (valA > valB) return dir === -1 ? -1 : 1;
        return 0;
      });
    }
    return this;
  }

  select(fields) {
    if (fields && fields.includes("-password")) {
      if (Array.isArray(this._data)) {
        this._data = this._data.map((item) => {
          if (!item) return item;
          const copy = { ...item };
          delete copy.password;
          return copy;
        });
      } else if (this._data && typeof this._data === "object") {
        const copy = { ...this._data };
        delete copy.password;
        this._data = copy;
      }
    }
    return this;
  }

  lean() {
    return this;
  }

  then(resolve, reject) {
    let result = this._data;
    if (Array.isArray(result)) {
      result = result.map((item) => wrapDoc(item, this._collectionMap));
    } else if (result && typeof result === "object") {
      result = wrapDoc(result, this._collectionMap);
    }
    return Promise.resolve(result).then(resolve, reject);
  }

  catch(reject) {
    return Promise.resolve(this._data).catch(reject);
  }
}

function patchModel(Model, collectionMap) {
  const origFind = Model.find.bind(Model);
  const origFindOne = Model.findOne.bind(Model);
  const origFindById = Model.findById.bind(Model);
  const origCreate = Model.create.bind(Model);
  const origCount = Model.countDocuments.bind(Model);
  const origFindByIdAndUpdate = Model.findByIdAndUpdate.bind(Model);
  const origUpdateMany = Model.updateMany.bind(Model);
  const origInsertMany = Model.insertMany.bind(Model);
  const origDeleteOne = Model.deleteOne.bind(Model);
  const origDeleteMany = Model.deleteMany.bind(Model);
  const origFindByIdAndDelete = Model.findByIdAndDelete.bind(Model);

  function isMongoOnline() {
    return mongoose.connection.readyState === 1;
  }

  Model.find = function (filter = {}) {
    if (isMongoOnline()) return origFind(filter);
    const matched = Array.from(collectionMap.values()).filter((item) => matchesFilter(item, filter));
    return new InMemoryQuery(matched, collectionMap);
  };

  Model.findOne = function (filter = {}) {
    if (isMongoOnline()) return origFindOne(filter);
    const matched = Array.from(collectionMap.values()).find((item) => matchesFilter(item, filter));
    return new InMemoryQuery(matched || null, collectionMap);
  };

  Model.findById = function (id) {
    if (isMongoOnline()) return origFindById(id);
    const item = collectionMap.get(id);
    return new InMemoryQuery(item || null, collectionMap);
  };

  Model.countDocuments = function (filter = {}) {
    if (isMongoOnline()) return origCount(filter);
    const count = Array.from(collectionMap.values()).filter((item) => matchesFilter(item, filter)).length;
    return Promise.resolve(count);
  };

  Model.create = function (doc) {
    if (isMongoOnline()) return origCreate(doc);
    const item = { _id: doc._id || `id_${Date.now()}_${Math.floor(Math.random() * 1000)}`, ...doc };
    collectionMap.set(item._id, item);
    const wrapped = wrapDoc(item, collectionMap);
    return Promise.resolve(wrapped);
  };

  Model.insertMany = function (docs = []) {
    if (isMongoOnline()) return origInsertMany(docs);
    const created = docs.map((doc) => {
      const item = { _id: doc._id || `id_${Date.now()}_${Math.floor(Math.random() * 1000)}`, ...doc };
      collectionMap.set(item._id, item);
      return wrapDoc(item, collectionMap);
    });
    return Promise.resolve(created);
  };

  Model.findByIdAndUpdate = function (id, update, options = {}) {
    if (isMongoOnline()) return origFindByIdAndUpdate(id, update, options);
    let item = collectionMap.get(id);
    if (!item && options.upsert) {
      const newId = update._id || id || `id_${Date.now()}`;
      item = { _id: newId };
    }
    if (!item) return new InMemoryQuery(null, collectionMap);

    item = applyUpdate(item, update);
    collectionMap.set(item._id, item);
    return new InMemoryQuery(item, collectionMap);
  };

  Model.updateMany = function (filter, update) {
    if (isMongoOnline()) return origUpdateMany(filter, update);
    let count = 0;
    for (const [id, item] of collectionMap.entries()) {
      if (matchesFilter(item, filter)) {
        const updated = applyUpdate(item, update);
        collectionMap.set(id, updated);
        count++;
      }
    }
    return Promise.resolve({ modifiedCount: count });
  };

  Model.deleteOne = function (filter) {
    if (isMongoOnline()) return origDeleteOne(filter);
    let deleted = 0;
    for (const [id, item] of collectionMap.entries()) {
      if (matchesFilter(item, filter)) {
        collectionMap.delete(id);
        deleted = 1;
        break;
      }
    }
    return Promise.resolve({ deletedCount: deleted });
  };

  Model.deleteMany = function (filter) {
    if (isMongoOnline()) return origDeleteMany(filter);
    let deleted = 0;
    for (const [id, item] of collectionMap.entries()) {
      if (!filter || Object.keys(filter).length === 0 || matchesFilter(item, filter)) {
        collectionMap.delete(id);
        deleted++;
      }
    }
    return Promise.resolve({ deletedCount: deleted });
  };

  Model.findByIdAndDelete = function (id) {
    if (isMongoOnline()) return origFindByIdAndDelete(id);
    const item = collectionMap.get(id);
    if (item) collectionMap.delete(id);
    return new InMemoryQuery(item || null, collectionMap);
  };
}

// Initialize model patches
patchModel(User, store.users);
patchModel(Chat, store.chats);
patchModel(Message, store.messages);
patchModel(StatusPost, store.statusPosts);
patchModel(AudienceProfile, store.audienceProfiles);
patchModel(UserFolder, store.userFolders);
patchModel(Report, store.reports);

module.exports = {
  store,
  seedInMemoryStore,
};
