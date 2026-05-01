---
name: test-skill
description: Skill de test pour vérifier le mécanisme de pull et push des skills. Use when testing skill synchronization, installation verification, or validating skill distribution workflow.
---

# Test Skill

## Overview

Ce skill sert uniquement à tester le mécanisme de pull/push des skills. Il contient un script simple qui affiche un message de confirmation.

## Usage

Pour utiliser ce skill de test :

1. Exécuter le script de test : `python3 scripts/test.py`
2. Vérifier que le message "✅ Test réussi ! Le skill fonctionne correctement." s'affiche

## Resources

### scripts/test.py
Script simple qui affiche un message de confirmation pour vérifier que le skill est correctement installé et fonctionne.
