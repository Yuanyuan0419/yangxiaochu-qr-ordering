/** Demo menu for 杨小厨 with EN/FR translations. Shared by seed.ts and translate-existing.ts. */

export const ALLERGENS = [
  ["GLUTEN", "麸质谷物", "Gluten", "Gluten"],
  ["CRUSTACEANS", "甲壳类", "Crustaceans", "Crustacés"],
  ["EGGS", "蛋类", "Eggs", "Œufs"],
  ["FISH", "鱼类", "Fish", "Poisson"],
  ["PEANUTS", "花生", "Peanuts", "Arachides"],
  ["SOYBEANS", "大豆", "Soybeans", "Soja"],
  ["MILK", "乳制品", "Milk", "Lait"],
  ["NUTS", "坚果", "Nuts", "Fruits à coque"],
  ["CELERY", "芹菜", "Celery", "Céleri"],
  ["MUSTARD", "芥末", "Mustard", "Moutarde"],
  ["SESAME", "芝麻", "Sesame", "Sésame"],
  ["SULPHITES", "亚硫酸盐", "Sulphites", "Sulfites"],
  ["LUPIN", "羽扇豆", "Lupin", "Lupin"],
  ["MOLLUSCS", "软体动物", "Molluscs", "Mollusques"],
] as const;

/** Ingredient translations: zh → [en, fr]. */
export const INGREDIENT_I18N: Record<string, [string, string]> = {
  黄瓜: ["Cucumber", "Concombre"], 蒜: ["Garlic", "Ail"], 香醋: ["Black vinegar", "Vinaigre noir"], 辣椒油: ["Chili oil", "Huile pimentée"],
  芝麻: ["Sesame", "Sésame"], 嫩豆腐: ["Silken tofu", "Tofu soyeux"], 芝麻酱: ["Sesame paste", "Pâte de sésame"], 酱油: ["Soy sauce", "Sauce soja"],
  葱: ["Spring onion", "Ciboule"], 春卷皮: ["Spring roll wrapper", "Feuille de rouleau de printemps"], 卷心菜: ["Cabbage", "Chou"],
  胡萝卜: ["Carrot", "Carotte"], 香菇: ["Shiitake", "Shiitaké"], 鸡肉: ["Chicken", "Poulet"], 花生: ["Peanuts", "Cacahuètes"],
  干辣椒: ["Dried chili", "Piment séché"], 花椒: ["Sichuan pepper", "Poivre du Sichuan"], 豆腐: ["Tofu", "Tofu"], 牛肉末: ["Minced beef", "Bœuf haché"],
  郫县豆瓣: ["Chili bean paste", "Pâte de fèves pimentée"], 蒜苗: ["Garlic shoots", "Pousses d'ail"], 茄子: ["Eggplant", "Aubergine"],
  姜: ["Ginger", "Gingembre"], 泡椒: ["Pickled chili", "Piment mariné"], 醋: ["Vinegar", "Vinaigre"], 糖: ["Sugar", "Sucre"],
  四季豆: ["Green beans", "Haricots verts"], 芽菜: ["Preserved mustard greens", "Moutarde confite"], 猪里脊: ["Pork tenderloin", "Filet de porc"],
  番茄酱: ["Tomato sauce", "Sauce tomate"], 淀粉: ["Starch", "Fécule"], 鸡蛋: ["Egg", "Œuf"], 番茄: ["Tomato", "Tomate"], 虾仁: ["Shrimp", "Crevettes"],
  牛肉: ["Beef", "Bœuf"], 豆芽: ["Bean sprouts", "Pousses de soja"], 辣椒: ["Chili", "Piment"], 米饭: ["Rice", "Riz"], 青豆: ["Peas", "Petits pois"],
  鸡蛋面: ["Egg noodles", "Nouilles aux œufs"], 洋葱: ["Onion", "Oignon"], 青菜: ["Greens", "Légumes verts"], 云吞皮: ["Wonton wrapper", "Pâte à wonton"],
  猪肉: ["Pork", "Porc"], 大米: ["Rice", "Riz"], 木耳: ["Wood ear mushroom", "Champignon noir"], 笋: ["Bamboo shoots", "Pousses de bambou"],
  白胡椒: ["White pepper", "Poivre blanc"], 红茶: ["Black tea", "Thé noir"], 牛奶: ["Milk", "Lait"], 冰: ["Ice", "Glaçons"], 橙子: ["Orange", "Orange"],
  草莓: ["Strawberry", "Fraise"], 柠檬: ["Lemon", "Citron"], 苏打水: ["Soda water", "Eau gazeuse"], 芒果: ["Mango", "Mangue"], 酸奶: ["Yogurt", "Yaourt"],
  西米: ["Tapioca pearls", "Perles de tapioca"], 椰奶: ["Coconut milk", "Lait de coco"], 香蕉: ["Banana", "Banane"], 奶油: ["Cream", "Crème"],
  香草: ["Vanilla", "Vanille"], 坚果碎: ["Crushed nuts", "Éclats de noix"],
};

export type Tag = "veg" | "vegan" | "spicy" | "gf";
export type SeedProduct = {
  name: string;
  en: [string, string];
  fr: [string, string];
  price: string;
  image: string;
  description: string;
  ingredients: string[];
  allergens: (typeof ALLERGENS)[number][0][];
  tags?: Tag[];
  available?: boolean;
};

export type SeedCategory = {
  category: string;
  description?: string;
  en: [string, string?];
  fr: [string, string?];
  products: SeedProduct[];
};

export const MENU: SeedCategory[] = [
  {
    category: "凉菜",
    description: "开胃小菜",
    en: ["Cold Dishes", "Appetisers"],
    fr: ["Entrées froides", "Pour commencer"],
    products: [
      { name: "蒜泥拍黄瓜", en: ["Smashed Cucumber Salad", "Smashed cucumber dressed with garlic, black vinegar and a touch of chili oil. Crisp and refreshing."], fr: ["Salade de concombre écrasé", "Concombre écrasé à l'ail, au vinaigre noir et à l'huile pimentée. Croquant et rafraîchissant."], price: "5.50", image: "cucumber", description: "清脆黄瓜拍碎，拌入蒜泥、香醋与少许辣油，清爽开胃。", ingredients: ["黄瓜", "蒜", "香醋", "辣椒油", "芝麻"], allergens: ["SESAME", "GLUTEN"], tags: ["veg", "vegan", "spicy"] },
      { name: "麻酱嫩豆腐", en: ["Chilled Silken Tofu with Sesame", "Chilled silken tofu with sesame paste, soy sauce and spring onion. Melts in your mouth."], fr: ["Tofu soyeux au sésame", "Tofu soyeux froid, pâte de sésame, sauce soja et ciboule. Fondant en bouche."], price: "6.00", image: "silken-tofu", description: "冰镇嫩豆腐淋上芝麻酱与酱油，撒葱花，入口即化。", ingredients: ["嫩豆腐", "芝麻酱", "酱油", "葱"], allergens: ["SOYBEANS", "SESAME", "GLUTEN"], tags: ["veg", "vegan"] },
      { name: "脆皮春卷", en: ["Crispy Spring Rolls", "Hand-rolled spring rolls, golden and crispy, filled with cabbage and carrot (3 pcs)."], fr: ["Rouleaux de printemps croustillants", "Rouleaux faits main, dorés et croustillants, farcis au chou et à la carotte (3 pièces)."], price: "5.80", image: "egg-rolls", description: "手工包制春卷，外皮金黄酥脆，内馅为卷心菜与胡萝卜（3 件）。", ingredients: ["春卷皮", "卷心菜", "胡萝卜", "香菇"], allergens: ["GLUTEN", "SOYBEANS"], tags: ["veg"] },
    ],
  },
  {
    category: "热菜",
    description: "现炒招牌",
    en: ["Hot Dishes", "Wok-fried signatures"],
    fr: ["Plats chauds", "Spécialités au wok"],
    products: [
      { name: "宫保鸡丁", en: ["Kung Pao Chicken", "Classic Sichuan kung pao chicken with peanuts, dried chili and Sichuan pepper. Sweet, tangy and mildly spicy."], fr: ["Poulet Kung Pao", "Poulet sauté à la sichuanaise, cacahuètes, piments séchés et poivre du Sichuan. Sucré, acidulé et légèrement épicé."], price: "12.50", image: "kung-pao", description: "传统川味宫保鸡丁，鸡腿肉搭配花生、干辣椒与花椒，酸甜微辣。", ingredients: ["鸡肉", "花生", "干辣椒", "葱", "酱油", "花椒"], allergens: ["PEANUTS", "SOYBEANS", "GLUTEN"], tags: ["spicy"] },
      { name: "麻婆豆腐", en: ["Mapo Tofu", "Numbing, spicy and fragrant: silky tofu with minced beef in chili bean sauce. Perfect with rice."], fr: ["Tofu Mapo", "Tofu fondant et bœuf haché dans une sauce pimentée aux fèves. Parfait avec du riz."], price: "10.50", image: "mapo-tofu", description: "麻、辣、烫、香、酥、嫩，郫县豆瓣慢炒牛肉末，配一碗米饭刚好。", ingredients: ["豆腐", "牛肉末", "郫县豆瓣", "花椒", "蒜苗"], allergens: ["SOYBEANS", "GLUTEN"], tags: ["spicy"] },
      { name: "鱼香茄子", en: ["Yu Xiang Eggplant", "Soft fried eggplant in a sweet, tangy and spicy garlic sauce."], fr: ["Aubergines Yu Xiang", "Aubergines fondantes dans une sauce aigre-douce pimentée à l'ail."], price: "11.00", image: "eggplant", description: "茄子炸至软糯，裹上甜酸带辣的鱼香汁。", ingredients: ["茄子", "蒜", "姜", "泡椒", "醋", "糖"], allergens: ["SOYBEANS", "GLUTEN"], tags: ["veg", "vegan", "spicy"] },
      { name: "干煸四季豆", en: ["Dry-fried Green Beans", "Green beans wok-blistered with preserved mustard greens and dried chili."], fr: ["Haricots verts sautés à sec", "Haricots verts saisis au wok avec moutarde confite et piments séchés."], price: "10.00", image: "long-beans", description: "四季豆煸至表皮起皱，与芽菜、干辣椒同炒，香而不腻。", ingredients: ["四季豆", "芽菜", "干辣椒", "蒜"], allergens: ["SOYBEANS"], tags: ["veg", "vegan", "spicy", "gf"] },
      { name: "糖醋里脊", en: ["Sweet & Sour Pork", "Crispy pork tenderloin glazed in a sweet and sour tomato sauce."], fr: ["Porc aigre-doux", "Filet de porc croustillant nappé d'une sauce aigre-douce à la tomate."], price: "13.50", image: "sweet-sour-pork", description: "外酥里嫩的猪里脊，挂上酸甜番茄糖醋汁。", ingredients: ["猪里脊", "番茄酱", "醋", "糖", "淀粉", "鸡蛋"], allergens: ["EGGS", "GLUTEN"] },
      { name: "番茄炒蛋", en: ["Tomato & Egg Stir-fry", "Home-style favourite: ripe tomatoes with silky scrambled eggs."], fr: ["Œufs brouillés aux tomates", "Un classique familial : tomates mûres et œufs brouillés fondants."], price: "9.50", image: "tomato-egg", description: "家常味道：熟透番茄与嫩滑鸡蛋，酸甜下饭。", ingredients: ["番茄", "鸡蛋", "葱", "糖"], allergens: ["EGGS"], tags: ["veg", "gf"] },
      { name: "宫保虾球", en: ["Kung Pao Prawns", "Plump prawns wok-fried kung pao style with crunchy peanuts."], fr: ["Crevettes Kung Pao", "Crevettes sautées façon Kung Pao avec cacahuètes croquantes."], price: "15.80", image: "kung-po-prawns", description: "大虾仁以宫保做法快炒，花生香脆，虾肉弹牙。", ingredients: ["虾仁", "花生", "干辣椒", "葱", "酱油"], allergens: ["CRUSTACEANS", "PEANUTS", "SOYBEANS", "GLUTEN"], tags: ["spicy"] },
      { name: "川味水煮牛肉", en: ["Sichuan Boiled Beef", "Tender beef slices in a fiery chili broth over vegetables."], fr: ["Bœuf bouilli du Sichuan", "Fines tranches de bœuf dans un bouillon pimenté, sur lit de légumes."], price: "16.50", image: "szechuan-beef", description: "嫩牛肉片浸在红油汤中，底铺时蔬，麻辣鲜香。", ingredients: ["牛肉", "豆芽", "辣椒", "花椒", "郫县豆瓣"], allergens: ["SOYBEANS", "CELERY", "GLUTEN"], tags: ["spicy"], available: false },
    ],
  },
  {
    category: "主食",
    en: ["Rice & Noodles"],
    fr: ["Riz et nouilles"],
    products: [
      { name: "扬州炒饭", en: ["Yangzhou Fried Rice", "Egg fried rice with chicken, peas and carrot."], fr: ["Riz sauté Yangzhou", "Riz sauté aux œufs, poulet, petits pois et carottes."], price: "9.00", image: "fried-rice", description: "粒粒分明的蛋炒饭，配鸡肉丁、青豆与胡萝卜。", ingredients: ["米饭", "鸡蛋", "鸡肉", "青豆", "胡萝卜"], allergens: ["EGGS"], tags: ["gf"] },
      { name: "牛肉炒面", en: ["Beef Lo Mein", "Egg noodles wok-tossed with beef and vegetables."], fr: ["Nouilles sautées au bœuf", "Nouilles aux œufs sautées au wok avec bœuf et légumes."], price: "11.50", image: "lo-mein", description: "鸡蛋面与牛肉片、时蔬大火快炒，酱香浓郁。", ingredients: ["鸡蛋面", "牛肉", "洋葱", "青菜", "酱油"], allergens: ["GLUTEN", "EGGS", "SOYBEANS"] },
      { name: "鲜虾云吞", en: ["Shrimp Wontons in Broth", "Thin-skinned shrimp and pork wontons in clear broth (8 pcs)."], fr: ["Wontons aux crevettes", "Wontons crevettes-porc à pâte fine, en bouillon clair (8 pièces)."], price: "8.50", image: "wontons", description: "皮薄馅大的鲜虾猪肉云吞，清汤底（8 只）。", ingredients: ["云吞皮", "虾仁", "猪肉", "葱", "姜"], allergens: ["GLUTEN", "CRUSTACEANS", "EGGS"] },
      { name: "鸡肉粥", en: ["Chicken Congee", "Silky rice porridge with shredded chicken and ginger."], fr: ["Congee au poulet", "Bouillie de riz onctueuse au poulet effiloché et gingembre."], price: "7.50", image: "congee", description: "米粒熬至绵滑，加入鸡丝与姜丝，暖胃之选。", ingredients: ["大米", "鸡肉", "姜", "葱"], allergens: [], tags: ["gf"] },
    ],
  },
  {
    category: "汤类",
    en: ["Soups"],
    fr: ["Soupes"],
    products: [
      { name: "酸辣汤", en: ["Hot & Sour Soup", "Tofu, wood ear mushroom, bamboo shoots and egg, with pepper and vinegar."], fr: ["Soupe aigre-piquante", "Tofu, champignons noirs, pousses de bambou et œuf, relevée au poivre et au vinaigre."], price: "6.50", image: "hot-sour-soup", description: "豆腐、木耳、笋丝与蛋花，胡椒与醋带来酸辣层次。", ingredients: ["豆腐", "木耳", "笋", "鸡蛋", "白胡椒", "醋"], allergens: ["EGGS", "SOYBEANS", "GLUTEN"], tags: ["veg", "spicy"] },
      { name: "西红柿蛋花汤", en: ["Tomato Egg Drop Soup", "Light and comforting egg drop soup with tomato."], fr: ["Soupe tomate et œuf", "Soupe légère et réconfortante aux tomates et œuf."], price: "5.50", image: "egg-drop-soup", description: "清淡鲜美的蛋花汤，适合搭配任何主菜。", ingredients: ["鸡蛋", "番茄", "葱"], allergens: ["EGGS"], tags: ["veg", "gf"] },
    ],
  },
  {
    category: "饮料",
    en: ["Drinks"],
    fr: ["Boissons"],
    products: [
      { name: "冰奶茶", en: ["Iced Milk Tea", "Black tea with milk, served chilled."], fr: ["Thé au lait glacé", "Thé noir au lait, servi bien frais."], price: "4.50", image: "iced-milk-tea", description: "红茶与淡奶调和，冰爽丝滑。", ingredients: ["红茶", "牛奶", "糖", "冰"], allergens: ["MILK"], tags: ["veg", "gf"] },
      { name: "鲜榨橙汁", en: ["Fresh Orange Juice", "Freshly squeezed every day, no added sugar."], fr: ["Jus d'orange pressé", "Pressé chaque jour, sans sucre ajouté."], price: "4.00", image: "orange-juice", description: "每日新鲜压榨，不额外加糖。", ingredients: ["橙子"], allergens: [], tags: ["veg", "vegan", "gf"] },
      { name: "草莓柠檬水", en: ["Strawberry Lemonade", "Fresh strawberries and lemon."], fr: ["Limonade à la fraise", "Fraises fraîches et citron."], price: "4.50", image: "strawberry-lemonade", description: "新鲜草莓与柠檬，酸甜解腻。", ingredients: ["草莓", "柠檬", "糖", "苏打水"], allergens: [], tags: ["veg", "vegan", "gf"] },
      { name: "可乐", en: ["Cola", "Chilled cola, 330 ml."], fr: ["Cola", "Cola bien frais, 33 cl."], price: "3.00", image: "cola", description: "冰镇可乐 330ml。", ingredients: [], allergens: [], tags: ["veg", "vegan", "gf"] },
    ],
  },
  {
    category: "甜品",
    en: ["Desserts"],
    fr: ["Desserts"],
    products: [
      { name: "芒果奶昔", en: ["Mango Smoothie", "Ripe mango blended with yogurt."], fr: ["Smoothie à la mangue", "Mangue mûre mixée avec du yaourt."], price: "5.50", image: "mango-smoothie", description: "熟芒果与酸奶打成浓郁奶昔。", ingredients: ["芒果", "酸奶", "牛奶"], allergens: ["MILK"], tags: ["veg", "gf"] },
      { name: "椰香西米露", en: ["Coconut Tapioca Pudding", "Coconut milk, tapioca pearls and banana. Served warm or cold."], fr: ["Perles de tapioca au coco", "Lait de coco, perles de tapioca et banane. Chaud ou froid."], price: "5.00", image: "tapioca", description: "椰奶、西米与香蕉，冷热皆宜。", ingredients: ["西米", "椰奶", "香蕉", "糖"], allergens: [], tags: ["veg", "vegan", "gf"] },
      { name: "坚果冰淇淋", en: ["Ice Cream with Nuts", "Vanilla ice cream topped with roasted nuts (2 scoops)."], fr: ["Glace aux éclats de noix", "Glace vanille et éclats de noix grillées (2 boules)."], price: "4.50", image: "ice-cream", description: "香草冰淇淋撒上烤坚果碎（两球）。", ingredients: ["牛奶", "奶油", "香草", "坚果碎"], allergens: ["MILK", "NUTS", "EGGS"], tags: ["veg"] },
    ],
  },
];
