/* ============================================================
   TrioProjet — logique de répartition équitable
   Méthode du serpentin : chacun son tour, dans l'ordre puis
   en sens inverse, comme sur les terrains de jeu.
   Tout se passe sur l'appareil : aucune donnée n'est envoyée.
   ============================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "trioprojet-state";
  var AVATAR_COLORS = ["#0071E3", "#34C759", "#FF9500", "#AF52DE",
                       "#FF2D55", "#5AC8FA", "#FFCC00", "#5856D6"];

  var state = { membres: [], taches: [] };

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

    btnRepartir: document.getElementById("btn-repartir"),
    resultat: document.getElementById("resultat"),
    grille: document.getElementById("grille-resultat"),
    btnCopier: document.getElementById("btn-copier"),
    btnRecommencer: document.getElementById("btn-recommencer"),
    toast: document.getElementById("toast")
  };

  // ---------- Persistance locale ----------

  function sauver() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* stockage indisponible : on continue sans */ }
  }

  function charger() {
    try {
      var brut = localStorage.getItem(STORAGE_KEY);
      if (brut) {
        var data = JSON.parse(brut);
        if (Array.isArray(data.membres)) state.membres = data.membres;
        if (Array.isArray(data.taches)) state.taches = data.taches;
      }
    } catch (e) { /* état corrompu : on repart de zéro */ }
  }

  // ---------- Utilitaires ----------

  function nettoyer(texte) {
    return texte.replace(/\s+/g, " ").trim();
  }

  function melanger(liste) {
    // Mélange de Fisher-Yates
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

  function couleurAvatar(index) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  }

  function initiale(nom) {
    return nom.charAt(0).toUpperCase();
  }

  // ---------- Rendu des chips ----------

  function boutonSuppression(liste, index, ariaNom) {
    var btn = document.createElement("button");
    btn.type = "button";
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
    // Membres
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
      noteM.textContent = "Ajoute au moins deux personnes pour commencer.";
      el.listeMembres.appendChild(noteM);
    }

    // Tâches
    el.listeTaches.innerHTML = "";
    state.taches.forEach(function (nom, i) {
      var li = document.createElement("li");
      li.appendChild(document.createTextNode(nom));
      li.appendChild(boutonSuppression(state.taches, i, nom));
      el.listeTaches.appendChild(li);
    });
    if (state.taches.length === 0) {
      var noteT = document.createElement("li");
      noteT.className = "empty-note";
      noteT.textContent = "Liste ici tout ce qu'il y a à faire dans le projet.";
      el.listeTaches.appendChild(noteT);
    }
  }

  // ---------- Ajouts ----------

  function ajouterMembre(event) {
    event.preventDefault();
    var nom = nettoyer(el.inputMembre.value);
    if (!nom) return;

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
    if (!nom) return;

    var dejaLa = state.taches.some(function (t) {
      return t.toLowerCase() === nom.toLowerCase();
    });
    if (dejaLa) {
      montrerFeedback(el.feedbackTache, "Cette tâche est déjà dans la liste.");
      return;
    }

    state.taches.push(nom);
    el.inputTache.value = "";
    sauver();
    rendre();
    el.inputTache.focus();
  }

  // ---------- Répartition (méthode du serpentin) ----------

  function repartir() {
    if (state.membres.length < 2) {
      montrerFeedback(el.feedbackMembre, "Il faut au moins deux membres pour répartir.");
      return;
    }
    if (state.taches.length < 1) {
      montrerFeedback(el.feedbackTache, "Ajoute au moins une tâche à répartir.");
      return;
    }

    var membres = state.membres.slice();
    var taches = melanger(state.taches);

    // Chaque membre reçoit un panier vide
    var paniers = membres.map(function (nom) {
      return { nom: nom, taches: [] };
    });

    // Serpentin : 1, 2, 3… puis 3, 2, 1, puis on recommence
    var sens = 1;
    var i = 0;
    taches.forEach(function (tache) {
      paniers[i].taches.push(tache);
      var suivant = i + sens;
      if (suivant >= paniers.length || suivant < 0) {
        sens = -sens;
      } else {
        i = suivant;
      }
    });

    afficherResultat(paniers);
  }

  function afficherResultat(paniers) {
    el.grille.innerHTML = "";

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
      badge.className = "count-badge";
      badge.textContent = panier.taches.length +
        (panier.taches.length > 1 ? " tâches" : " tâche");

      head.appendChild(nom);
      head.appendChild(badge);

      var ul = document.createElement("ul");
      panier.taches.forEach(function (tache) {
        var li = document.createElement("li");
        li.textContent = tache;
        ul.appendChild(li);
      });

      carte.appendChild(head);
      carte.appendChild(ul);
      el.grille.appendChild(carte);
    });

    el.resultat.hidden = false;
    el.btnCopier.disabled = false;
    el.btnRecommencer.textContent = "Recommencer";
    el.resultat.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Copie du résultat ----------

  function texteARectifier() {
    var lignes = ["Répartition du projet — " +
      new Date().toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric"
      }), ""];

    el.grille.querySelectorAll(".member-card").forEach(function (carte) {
      var nom = carte.querySelector(".member-name").textContent.trim();
      var taches = [];
      carte.querySelectorAll("ul li").forEach(function (li) {
        taches.push(li.textContent.trim());
      });
      lignes.push(nom + " : " + taches.join(" · "));
    });

    lignes.push("", "Réparti avec TrioProjet 🤝");
    return lignes.join("\n");
  }

  function copierResultat() {
    var texte = texteARectifier();

    function succes() {
      el.toast.classList.add("visible");
      setTimeout(function () {
        el.toast.classList.remove("visible");
      }, 1800);
    }

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
    sauver();
    rendre();
    el.resultat.hidden = true;
    el.btnRecommencer.textContent = "Recommencer";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Initialisation ----------

  function init() {
    charger();
    rendre();

    el.formMembre.addEventListener("submit", ajouterMembre);
    el.formTache.addEventListener("submit", ajouterTache);
    el.btnRepartir.addEventListener("click", repartir);
    el.btnCopier.addEventListener("click", copierResultat);
    el.btnRecommencer.addEventListener("click", recommencer);

    // Petite entrée en douceur pour le hero et les cartes
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
