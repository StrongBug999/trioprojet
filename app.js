/* ============================================================
   TrioProjet — répartition équilibrée par charge
   ------------------------------------------------------------
   Méthode : les tâches sont mélangées, classées de la plus
   longue à la plus courte, puis chacune rejoint le membre qui
   a le moins de temps sur les épaules. C'est l'heuristique
   "Longest Processing Time" : simple à comprendre, très
   difficile à battre à la main.
   Tout se passe sur l'appareil : aucune donnée n'est envoyée.
   ============================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "trioprojet-state-v2";
  var AVATAR_COLORS = ["#0071E3", "#34C759", "#FF9500", "#AF52DE",
                       "#FF2D55", "#5AC8FA", "#FFCC00", "#5856D6"];
  var DUREES_RAPIDES = [10, 15, 20, 30, 45, 60, 90, 120];
  var DUREE_DEFAUT = 30;
  var DUREE_MIN = 5;
  var DUREE_MAX = 600;

  var state = { membres: [], taches: [] };
  var dureeNouvelleTache = DUREE_DEFAUT;

  // ---------- Raccourcis DOM ----------

  var el = {
    formMembre: document.getElementById("form-membre"),
    inputMembre: document.getElementById("input-membre"),
    feedbackMembre: document.getElementById("feedback-membre"),
    listeMembres: document.getElementById("liste-membres"),

    formTache: document.getElementById("form-tache"),
    inputTache: document.getElementById("input-tache"),
    feedbackTache: document.getElementById("feedback-tache"),
    listeTaches: document.getElementById("liste-taches"),
    btnDuree: document.getElementById("btn-duree"),
    dureeLabel: document.getElementById("duree-label"),

    btnRepartir: document.getElementById("btn-repartir"),
    resultat: document.getElementById("resultat"),
    equilibre: document.getElementById("equilibre"),
    grille: document.getElementById("grille-resultat"),
    btnCopier: document.getElementById("btn-copier"),
    btnLien: document.getElementById("btn-lien"),
    btnRedistribuer: document.getElementById("btn-retirer"),
    btnRecommencer: document.getElementById("btn-recommencer"),
    toast: document.getElementById("toast")
  };

  // ---------- Persistance locale ----------

  function sauver() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* stockage indisponible : on continue sans */ }
  }

  function etatValide(data) {
    return data && Array.isArray(data.membres) && Array.isArray(data.taches);
  }

  function normaliserTache(t) {
    if (typeof t === "string") {
      return { nom: t, min: DUREE_DEFAUT };
    }
    if (t && typeof t.nom === "string") {
      var min = parseInt(t.min, 10);
      return { nom: t.nom, min: isNaN(min) ? DUREE_DEFAUT : min };
    }
    return null;
  }

  function charger() {
    var brut = null;
    try { brut = localStorage.getItem(STORAGE_KEY); } catch (e) { /* rien */ }

    if (brut) {
      try {
        var data = JSON.parse(brut);
        if (etatValide(data)) {
          state.membres = data.membres.filter(function (m) {
            return typeof m === "string" && m.trim();
          });
          state.taches = data.taches.map(normaliserTache).filter(Boolean);
        }
      } catch (e) { /* état corrompu : on repart de zéro */ }
      return;
    }

    // Migration depuis l'ancienne version (tâches sans durée)
    try {
      var ancien = JSON.parse(localStorage.getItem("trioprojet-state") || "null");
      if (etatValide(ancien)) {
        state.membres = ancien.membres.slice();
        state.taches = ancien.taches.map(normaliserTache).filter(Boolean);
        sauver();
      }
    } catch (e) { /* rien à migrer */ }
  }

  // ---------- Partage par lien (tout tient dans l'URL) ----------

  function encoderEtat() {
    var compact = {
      m: state.membres,
      t: state.taches.map(function (t) { return [t.nom, t.min]; })
    };
    var json = JSON.stringify(compact);
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decoderEtat(chaine) {
    try {
      var b64 = chaine.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) { b64 += "="; }
      var json = decodeURIComponent(escape(atob(b64)));
      var compact = JSON.parse(json);
      if (!Array.isArray(compact.m) || !Array.isArray(compact.t)) { return false; }
      state.membres = compact.m.filter(function (m) {
        return typeof m === "string" && m.trim();
      });
      state.taches = compact.t.map(normaliserTache).filter(Boolean);
      return true;
    } catch (e) {
      return false;
    }
  }

  function urlDePartage() {
    var base = location.origin + location.pathname;
    return base + "#p=" + encoderEtat();
  }

  // ---------- Utilitaires ----------

  function nettoyer(texte) {
    return texte.replace(/\s+/g, " ").trim();
  }

  function melanger(liste) {
    var copie = liste.slice();
    for (var i = copie.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copie[i];
      copie[i] = copie[j];
      copie[j] = tmp;
    }
    return copie;
  }

  function montrerFeedback(node, message) {
    node.textContent = message;
    node.classList.add("visible");
    setTimeout(function () { node.classList.remove("visible"); }, 2600);
  }

  function montrerToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("visible");
    clearTimeout(montrerToast._timer);
    montrerToast._timer = setTimeout(function () {
      el.toast.classList.remove("visible");
    }, 2200);
  }

  function couleurAvatar(index) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  }

  function initiale(nom) {
    return nom.charAt(0).toUpperCase();
  }

  function formaterDuree(min) {
    if (min < 60) { return min + " min"; }
    var h = Math.floor(min / 60);
    var reste = min % 60;
    if (reste === 0) { return h + " h"; }
    if (reste < 10) { return h + " h 0" + reste; }
    return h + " h " + reste;
  }

  // ---------- Popover de durée ----------

  var popoverActif = null;

  function fermerPopover() {
    if (popoverActif) {
      popoverActif.remove();
      popoverActif = null;
      document.removeEventListener("click", clicExterieur, true);
      document.removeEventListener("keydown", echappe, true);
    }
  }

  function clicExterieur(event) {
    if (popoverActif && !popoverActif.contains(event.target)) {
      fermerPopover();
    }
  }

  function echappe(event) {
    if (event.key === "Escape") { fermerPopover(); }
  }

  function ouvrirPopover(ancre, minuteActuelle, auChoix) {
    fermerPopover();

    var pop = document.createElement("div");
    pop.className = "popover";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Temps estimé");

    var label = document.createElement("p");
    label.className = "popover-label";
    label.textContent = "Temps estimé";
    pop.appendChild(label);

    var grille = document.createElement("div");
    grille.className = "popover-grid";

    DUREES_RAPIDES.forEach(function (min) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = min >= 60 ? (min / 60) + " h" : min + "'";
      if (min === minuteActuelle) { btn.classList.add("selected"); }
      btn.addEventListener("click", function () {
        auChoix(min);
        fermerPopover();
      });
      grille.appendChild(btn);
    });

    pop.appendChild(grille);

    var custom = document.createElement("div");
    custom.className = "popover-custom";

    var input = document.createElement("input");
    input.type = "number";
    input.min = DUREE_MIN;
    input.max = DUREE_MAX;
    input.placeholder = "Autre…";
    input.setAttribute("aria-label", "Durée personnalisée en minutes");

    var ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "OK";

    function validerCustom() {
      var valeur = parseInt(input.value, 10);
      if (isNaN(valeur)) { return; }
      valeur = Math.max(DUREE_MIN, Math.min(DUREE_MAX, valeur));
      auChoix(valeur);
      fermerPopover();
    }

    ok.addEventListener("click", validerCustom);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        validerCustom();
      }
    });

    custom.appendChild(input);
    custom.appendChild(ok);
    pop.appendChild(custom);

    document.body.appendChild(popoverActif = pop);

    var rect = ancre.getBoundingClientRect();
    var largeurPop = 236;
    var gauche = rect.left + window.scrollX;
    if (gauche + largeurPop > window.scrollX + document.documentElement.clientWidth - 12) {
      gauche = rect.right + window.scrollX - largeurPop;
    }
    pop.style.left = gauche + "px";
    pop.style.top = (rect.bottom + window.scrollY + 8) + "px";

    setTimeout(function () {
      document.addEventListener("click", clicExterieur, true);
      document.addEventListener("keydown", echappe, true);
      input.focus();
    }, 0);
  }

  function majLabelDuree() {
    el.dureeLabel.textContent = formaterDuree(dureeNouvelleTache);
  }

  // ---------- Rendu des chips ----------

  function boutonSuppression(liste, index, ariaNom) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "retrait";
    btn.textContent = "✕";
    btn.setAttribute("aria-label", "Retirer " + ariaNom);
    btn.addEventListener("click", function () {
      liste.splice(index, 1);
      sauver();
      rendre();
    });
    return btn;
  }

  function rendre() {
    el.listeMembres.innerHTML = "";
    state.membres.forEach(function (nom, i) {
      var li = document.createElement("li");
      li.appendChild(document.createTextNode(nom));
      li.appendChild(boutonSuppression(state.membres, i, nom));
      el.listeMembres.appendChild(li);
    });
    if (state.membres.length === 0) {
      var noteM = document.createElement("li");
      noteM.className = "empty-note";
      noteM.textContent = "Qui fait partie du groupe ? Ajoutez au moins deux prénoms.";
      el.listeMembres.appendChild(noteM);
    }

    el.listeTaches.innerHTML = "";
    state.taches.forEach(function (tache, i) {
      var li = document.createElement("li");

      var nom = document.createElement("span");
      nom.textContent = tache.nom;
      li.appendChild(nom);

      var badge = document.createElement("button");
      badge.type = "button";
      badge.className = "duree-badge";
      badge.textContent = formaterDuree(tache.min);
      badge.title = "Modifier le temps estimé";
      badge.setAttribute("aria-label",
        "Temps estimé : " + formaterDuree(tache.min) + ". Modifier.");
      badge.addEventListener("click", function () {
        ouvrirPopover(badge, tache.min, function (min) {
          tache.min = min;
          sauver();
          rendre();
        });
      });
      li.appendChild(badge);

      li.appendChild(boutonSuppression(state.taches, i, tache.nom));
      el.listeTaches.appendChild(li);
    });
    if (state.taches.length === 0) {
      var noteT = document.createElement("li");
      noteT.className = "empty-note";
      noteT.textContent = "Listez ce qu'il y a à faire — le temps estimé se règle sur chaque tâche.";
      el.listeTaches.appendChild(noteT);
    }
  }

  // ---------- Ajouts ----------

  function ajouterMembre(event) {
    event.preventDefault();
    var nom = nettoyer(el.inputMembre.value);
    if (!nom) { return; }

    var dejaLa = state.membres.some(function (m) {
      return m.toLowerCase() === nom.toLowerCase();
    });
    if (dejaLa) {
      montrerFeedback(el.feedbackMembre, "« " + nom + " » est déjà dans la liste.");
      return;
    }

    state.membres.push(nom);
    el.inputMembre.value = "";
    sauver();
    rendre();
    el.inputMembre.focus();
  }

  function ajouterTache(event) {
    event.preventDefault();
    var nom = nettoyer(el.inputTache.value);
    if (!nom) { return; }

    var dejaLa = state.taches.some(function (t) {
      return t.nom.toLowerCase() === nom.toLowerCase();
    });
    if (dejaLa) {
      montrerFeedback(el.feedbackTache, "Cette tâche est déjà dans la liste.");
      return;
    }

    state.taches.push({ nom: nom, min: dureeNouvelleTache });
    el.inputTache.value = "";
    dureeNouvelleTache = DUREE_DEFAUT;
    majLabelDuree();
    sauver();
    rendre();
    el.inputTache.focus();
  }

  // ---------- Répartition équilibrée par charge ----------

  function repartir() {
    if (state.membres.length < 2) {
      montrerFeedback(el.feedbackMembre, "Il faut au moins deux membres pour répartir.");
      return;
    }
    if (state.taches.length < 1) {
      montrerFeedback(el.feedbackTache, "Ajoute au moins une tâche à répartir.");
      return;
    }

    // 1. Ordre aléatoire, puis les plus longues d'abord
    var taches = melanger(state.taches).slice().sort(function (a, b) {
      return b.min - a.min;
    });

    var paniers = state.membres.map(function (nom) {
      return { nom: nom, taches: [], charge: 0 };
    });

    // 2. Chaque tâche rejoint le membre le moins chargé
    taches.forEach(function (tache) {
      var elu = 0;
      for (var i = 1; i < paniers.length; i++) {
        if (paniers[i].charge < paniers[elu].charge) { elu = i; }
      }
      paniers[elu].taches.push(tache);
      paniers[elu].charge += tache.min;
    });

    afficherResultat(paniers);
  }

  function afficherResultat(paniers) {
    el.grille.innerHTML = "";

    var charges = paniers.map(function (p) { return p.charge; });
    var ecart = Math.max.apply(null, charges) - Math.min.apply(null, charges);

    el.equilibre.textContent = ecart === 0
      ? "Charge identique pour tout le monde"
      : "Écart maximum : " + formaterDuree(ecart);

    paniers.forEach(function (panier, index) {
      var carte = document.createElement("article");
      carte.className = "member-card";
      carte.style.animationDelay = (index * 0.07) + "s";

      var head = document.createElement("div");
      head.className = "member-head";

      var nom = document.createElement("span");
      nom.className = "member-name";

      var avatar = document.createElement("span");
      avatar.className = "avatar";
      avatar.textContent = initiale(panier.nom);
      avatar.style.background = couleurAvatar(index);

      nom.appendChild(avatar);
      nom.appendChild(document.createTextNode(panier.nom));

      var badge = document.createElement("span");
      badge.className = "total-badge";
      badge.textContent = formaterDuree(panier.charge);

      head.appendChild(nom);
      head.appendChild(badge);

      var ul = document.createElement("ul");
      panier.taches.forEach(function (tache) {
        var li = document.createElement("li");

        var libelle = document.createElement("span");
        libelle.className = "tache-nom";
        libelle.textContent = tache.nom;
        li.appendChild(libelle);

        var duree = document.createElement("span");
        duree.className = "tache-duree";
        duree.textContent = formaterDuree(tache.min);
        li.appendChild(duree);

        ul.appendChild(li);
      });

      carte.appendChild(head);
      carte.appendChild(ul);
      el.grille.appendChild(carte);
    });

    el.resultat.hidden = false;
    el.btnCopier.disabled = false;
    el.btnLien.disabled = false;
    el.btnRecommencer.textContent = "Recommencer";
    el.resultat.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Copie du résultat ----------

  function texteResultat() {
    var lignes = ["Répartition du projet — " +
      new Date().toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric"
      }), ""];

    el.grille.querySelectorAll(".member-card").forEach(function (carte) {
      var nom = carte.querySelector(".member-name").textContent.trim();
      var total = carte.querySelector(".total-badge").textContent.trim();
      lignes.push(nom + " — " + total + " au total");
      carte.querySelectorAll("ul li").forEach(function (li) {
        var tache = li.querySelector(".tache-nom").textContent.trim();
        var duree = li.querySelector(".tache-duree").textContent.trim();
        lignes.push("  · " + tache + " (" + duree + ")");
      });
      lignes.push("");
    });

    lignes.push("Équilibré avec TrioProjet");
    return lignes.join("\n");
  }

  function copier(texte, messageSucces) {
    function succes() { montrerToast(messageSucces); }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texte).then(succes).catch(function () {
        copierSecours(texte, succes);
      });
    } else {
      copierSecours(texte, succes);
    }
  }

  function copierSecours(texte, succes) {
    var zone = document.createElement("textarea");
    zone.value = texte;
    zone.style.position = "fixed";
    zone.style.opacity = "0";
    document.body.appendChild(zone);
    zone.select();
    try {
      document.execCommand("copy");
      succes();
    } catch (e) { /* rien de plus à tenter */ }
    document.body.removeChild(zone);
  }

  // ---------- Recommencer ----------

  function recommencer() {
    if (el.btnRecommencer.textContent === "Recommencer") {
      el.btnRecommencer.textContent = "Sûr ?";
      setTimeout(function () {
        el.btnRecommencer.textContent = "Recommencer";
      }, 2500);
      return;
    }
    state = { membres: [], taches: [] };
    if (location.hash.indexOf("#p=") === 0) {
      history.replaceState(null, "", location.pathname);
    }
    sauver();
    rendre();
    el.resultat.hidden = true;
    el.btnRecommencer.textContent = "Recommencer";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Initialisation ----------

  function init() {
    var importe = false;
    if (location.hash.indexOf("#p=") === 0) {
      importe = decoderEtat(location.hash.slice(3));
      if (importe) { sauver(); }
    }
    if (!importe) { charger(); }
    rendre();
    majLabelDuree();

    if (importe) {
      setTimeout(function () {
        montrerToast("Projet chargé depuis le lien");
      }, 400);
    }

    el.formMembre.addEventListener("submit", ajouterMembre);
    el.formTache.addEventListener("submit", ajouterTache);
    el.btnDuree.addEventListener("click", function () {
      ouvrirPopover(el.btnDuree, dureeNouvelleTache, function (min) {
        dureeNouvelleTache = min;
        majLabelDuree();
      });
    });
    el.btnRepartir.addEventListener("click", repartir);
    el.btnCopier.addEventListener("click", function () {
      copier(texteResultat(), "Résultat copié — à coller dans le groupe");
    });
    el.btnLien.addEventListener("click", function () {
      copier(urlDePartage(), "Lien du projet copié — envoyez-le au groupe");
    });
    el.btnRedistribuer.addEventListener("click", repartir);
    el.btnRecommencer.addEventListener("click", recommencer);

    var hero = document.querySelector(".hero");
    if (hero) {
      hero.classList.add("rise");
      document.querySelectorAll(".card, .action").forEach(function (n, i) {
        n.classList.add("rise");
        n.classList.add("rise-" + ((i % 3) + 1));
      });
    }
  }

  init();
})();
