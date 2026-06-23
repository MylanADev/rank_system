// ============================================================
//  SYSTÈME DE RANGS, STAFF MODE & TICKETING
//  Minecraft 1.21.1 - NeoForge - KubeJS
// ============================================================

// --- CONFIGURATION DES ACCÈS AUX COMMANDES ----------------
var RankSys_COMMAND_PERMISSIONS = {
    'modmute':     'modo',
    'modunmute':   'modo',
    'modfreeze':   'modo',
    'modunfreeze': 'modo',
    'modwarn':     'modo',
    'modwarns':    'modo', 
    'modunwarn':   'modo',
    'modtp':       'modo',
    'modstaff':    'modo',
    'reports':     'modo',

    'modkick':     'admin',
    'modban':      'admin',
    'modunban':    'admin',
    'modgm':       'admin',
    'modclear':    'admin',
    'modheal':     'admin',
    'broadcast':   'admin',
    'admin_chat':  'admin',

    'rank_set':    'fondateur' 
};

// --- CONFIGURATION DES OUTILS DU STAFF MODE ---------------
const StaffSys_TOOLS = {
    'tp':        { id: 'minecraft:ender_pearl',   name: '§dTéléportation',      slot: 0, type: 'target_player', cmd: 'modtp' },
    'freeze':    { id: 'minecraft:blaze_rod',     name: '§eGeler (Freeze)',     slot: 1, type: 'target_player', cmd: 'modfreeze' },
    'mute':      { id: 'minecraft:string',        name: '§7Rendre Muet',        slot: 2, type: 'target_player', cmd: 'modmute' },
    
    'gm_toggle': { id: 'minecraft:feather',       name: '§eMode: Solide (Créatif)',     slot: 5, type: 'toggle_gm', cmd: null },
    'build':     { id: 'minecraft:bricks',        name: '§aActiver Mode Construction',  slot: 6, type: 'toggle_build', cmd: null },

    'exit_build':{ id: 'minecraft:slime_ball',    name: '§cRetour au Menu Staff',       slot: 8, type: 'exit_build', cmd: null },

    'warn':      { id: 'minecraft:redstone_torch',name: '§cAvertir (Warn)',     slot: 9,  type: 'target_player', cmd: 'modwarn' },
    'ban':       { id: 'minecraft:tnt',           name: '§4Bannir (Ban)',       slot: 10, type: 'target_player', cmd: 'modban' },
    'clear':     { id: 'minecraft:sponge',        name: '§eNettoyer mon inventaire', slot: 17, type: 'direct_cmd', cmd: 'modclear' },
    'heal':      { id: 'minecraft:golden_apple',  name: '§cSe soigner',         slot: 16, type: 'direct_cmd', cmd: 'modheal' }
};

var RankSys_RANK_ORDER = ['joueur', 'modo', 'admin', 'fondateur']

function RankSysStringArgType() { return Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType') }
function RankSysIntegerArgumentType() { return Java.loadClass('com.mojang.brigadier.arguments.IntegerArgumentType') }

// ============================================================
//  FONCTIONS UTILITAIRES
// ============================================================

function getPlayerWarns(player) {
    const jsonStr = player.persistentData.getString('warnsJson')
    if (!jsonStr) return []
    try { return JSON.parse(jsonStr) } catch (e) { return [] }
}

function savePlayerWarns(player, warnsArray) {
    player.persistentData.putString('warnsJson', JSON.stringify(warnsArray))
}

function getRank(player) {
    const rank = player.persistentData.getString('rank')
    return RankSys_RANK_ORDER.includes(rank) ? rank : 'joueur'
}

function hasRank(player, minRank) {
    return RankSys_RANK_ORDER.indexOf(getRank(player)) >= RankSys_RANK_ORDER.indexOf(minRank)
}

function setRank(server, player, rank) {
    player.persistentData.putString('rank', rank)
    if (server) {
        if (rank === 'fondateur') server.runCommandSilent(`op ${player.username}`)
        else server.runCommandSilent(`deop ${player.username}`)
    }
}

function requireRankFor(commandKey) {
    const minRank = RankSys_COMMAND_PERMISSIONS[commandKey] || 'fondateur';
    return src => src.player == null || hasRank(src.player, minRank)
}

function doGamemode(server, ctx, Arguments, mode) {
    const target = Arguments.PLAYER.getResult(ctx, 'cible')
    if (server) server.runCommandSilent(`gamemode ${mode} ${target.username}`)
    return 1
}

// ============================================================
//  LOGIQUE DU STAFF MODE
// ============================================================

function giveStaffTools(player) {
    player.inventory.clear();
    Object.keys(StaffSys_TOOLS).forEach(key => {
        const tool = StaffSys_TOOLS[key];
        if (tool.type === 'exit_build') return; 
        
        let item = Item.of(tool.id).withName(tool.name);
        if (tool.type === 'target_player') {
            item.setLore(['§7Utilisez (Clic Droit ou Jeter) pour préparer la commande', '§7puis tapez le pseudo du joueur.']);
        } else if (tool.type === 'direct_cmd' || tool.type === 'toggle_build' || tool.type === 'toggle_gm') {
            item.setLore(['§7Utilisez (Clic Droit ou Jeter) pour exécuter l\'action.']);
        }
        item.set('minecraft:custom_data', { StaffTool: key });
        // Ajout de la Malédiction de Disparition pour sécuriser la mort
        item.enchant('minecraft:vanishing_curse', 1);
        player.inventory.setItem(tool.slot, item);
    });

    if (player.isSpectator()) {
        let gmItem = Item.of('minecraft:phantom_membrane').withName('§bMode: Fantôme (Spectateur)');
        gmItem.set('minecraft:custom_data', { StaffTool: 'gm_toggle' });
        gmItem.enchant('minecraft:vanishing_curse', 1);
        player.inventory.setItem(StaffSys_TOOLS['gm_toggle'].slot, gmItem);
    }
}

function toggleStaffMode(player) {
    const pData = player.persistentData;
    const isStaffMode = pData.getBoolean('staffMode');

    if (isStaffMode) {
        player.inventory.clear();
        if (pData.contains('savedInventory')) {
            const savedItems = pData.getList('savedInventory', 10);
            for (let i = 0; i < savedItems.size(); i++) {
                let itemTag = savedItems.getCompound(i);
                let slot = itemTag.getByte('Slot');
                let itemStack = Item.of(itemTag).itemStack;
                player.inventory.setItem(slot, itemStack);
            }
        }
        
        const savedGM = pData.getString('savedGamemode') || 'survival';
        player.server.runCommandSilent(`gamemode ${savedGM} ${player.username}`);

        if (pData.contains('savedHealth')) player.health = pData.getFloat('savedHealth');
        if (pData.contains('savedFood')) player.foodLevel = pData.getInt('savedFood');

        pData.putBoolean('staffMode', false);
        pData.putBoolean('staffBuildMode', false); 
        player.tell(Text.green('Staff Mode désactivé. Inventaire, vie, faim et mode de jeu restaurés.'));

    } else {
        let currentGM = 'survival';
        if (player.isCreativeMode()) currentGM = 'creative';
        else if (player.isSpectator()) currentGM = 'spectator';
        else if (player.server.runCommandSilent(`execute if entity ${player.username}[gamemode=adventure]`) > 0) currentGM = 'adventure';
        pData.putString('savedGamemode', currentGM);

        pData.putFloat('savedHealth', player.health);
        pData.putInt('savedFood', player.foodLevel);

        let savedList = Utils.newList();
        for (let i = 0; i < 36; i++) {
            let item = player.inventory.getItem(i);
            if (item && item.id !== 'minecraft:air') {
                let itemTag = item.save(Utils.newCompound());
                itemTag.putByte('Slot', i);
                savedList.add(itemTag);
            }
        }
        pData.putList('savedInventory', savedList);
        
        player.server.runCommandSilent(`gamemode creative ${player.username}`);
        player.health = 20.0;
        player.foodLevel = 20;

        giveStaffTools(player);

        pData.putBoolean('staffMode', true);
        player.tell(Text.gold('Staff Mode activé. Vous êtes en Créatif protégé. Ouvrez l\'inventaire (E).'));
    }
}

// ============================================================
//  MOTEUR D'EXÉCUTION DES OUTILS
// ============================================================

function executeStaffTool(player, toolKey) {
    const tool = StaffSys_TOOLS[toolKey];
    if (!tool) return;

    if (tool.type === 'toggle_gm') {
        if (player.isSpectator()) {
            player.server.runCommandSilent(`gamemode creative ${player.username}`);
            player.tell(Text.green('Mode Tangible : Vous êtes en Créatif (collision activée).'));
            let gmItem = Item.of('minecraft:feather').withName('§eMode: Solide (Créatif)');
            gmItem.set('minecraft:custom_data', { StaffTool: 'gm_toggle' });
            gmItem.enchant('minecraft:vanishing_curse', 1);
            player.inventory.setItem(StaffSys_TOOLS['gm_toggle'].slot, gmItem);
        } else {
            player.server.runCommandSilent(`gamemode spectator ${player.username}`);
            player.tell(Text.aqua('Mode Fantôme : Vous êtes en Spectateur (passe-murailles).'));
            let gmItem = Item.of('minecraft:phantom_membrane').withName('§bMode: Fantôme (Spectateur)');
            gmItem.set('minecraft:custom_data', { StaffTool: 'gm_toggle' });
            gmItem.enchant('minecraft:vanishing_curse', 1);
            player.inventory.setItem(StaffSys_TOOLS['gm_toggle'].slot, gmItem);
        }
    }
    else if (tool.type === 'toggle_build') {
        player.persistentData.putBoolean('staffBuildMode', true);
        player.tell(Text.green('Mode Construction ACTIVÉ. Outils masqués, Anti-Grief désactivé.'));
        player.inventory.clear();
        
        let exitItem = Item.of(StaffSys_TOOLS['exit_build'].id).withName(StaffSys_TOOLS['exit_build'].name);
        exitItem.set('minecraft:custom_data', { StaffTool: 'exit_build' });
        exitItem.enchant('minecraft:vanishing_curse', 1);
        player.inventory.setItem(StaffSys_TOOLS['exit_build'].slot, exitItem);
    }
    else if (tool.type === 'exit_build') {
        player.persistentData.putBoolean('staffBuildMode', false);
        player.tell(Text.red('Mode Construction DÉSACTIVÉ. Protection Anti-Grief réactivée.'));
        giveStaffTools(player);
    }
    else if (tool.type === 'direct_cmd') {
        player.server.runCommandSilent(`execute as ${player.username} run ${tool.cmd}`);
    }
    else if (tool.type === 'target_player') {
        player.closeMenu(); 
        player.tell(Text.gold(`▶ Prêt pour ${tool.name}. Tapez le pseudo :`));
        player.tell(Text.green('➤ [ CLIQUEZ ICI POUR ENTRER LE PSEUDO ]').click('suggest_command', `/${tool.cmd} `));
    }
}

// ============================================================
//  ÉVÉNEMENTS SERVEUR & INTERACTIONS
// ============================================================

ItemEvents.rightClicked(event => {
    const { player, item } = event;
    if (!player.persistentData.getBoolean('staffMode')) return;

    if (item.has('minecraft:custom_data') && item.get('minecraft:custom_data').StaffTool) {
        event.cancel(); 
        const toolKey = item.get('minecraft:custom_data').StaffTool;
        executeStaffTool(player, toolKey);
    }
});

ItemEvents.dropped(event => {
    const { item, player } = event; 
    if (!player) return;

    const pData = player.persistentData;
    const itemStack = item.item; 
    
    if (pData.getBoolean('staffMode')) {
        if (itemStack.has('minecraft:custom_data') && itemStack.get('minecraft:custom_data').StaffTool) {
            event.cancel(); 
            const toolKey = itemStack.get('minecraft:custom_data').StaffTool;
            executeStaffTool(player, toolKey); 
        } 
        else if (!pData.getBoolean('staffBuildMode')) {
            item.discard(); 
            player.tell(Text.gray('Item désintégré (Aspirateur Anti-Pollution).'));
        }
    }
});

BlockEvents.broken(event => {
    const { player } = event;
    const pData = player.persistentData;
    
    if (player && pData && pData.getBoolean('staffMode')) {
        if (pData.getBoolean('staffBuildMode')) return; 
        if (player.mainHandItem.id === 'minecraft:wooden_axe') return; 
        
        event.cancel();
        player.setStatusMessage(Text.red('Action bloquée : Activez le Mode Construction pour casser.'));
    }
});

BlockEvents.placed(event => {
    const { player } = event;
    const pData = player.persistentData;
    
    if (player && pData && pData.getBoolean('staffMode')) {
        if (pData.getBoolean('staffBuildMode')) return; 
        
        event.cancel();
        player.setStatusMessage(Text.red('Action bloquée : Activez le Mode Construction pour poser.'));
    }
});

PlayerEvents.loggedIn(event => {
    const { player } = event;
    const pData = player.persistentData;

    if (!pData.contains('rank')) {
        pData.putString('rank', player.hasPermissions(4) ? 'fondateur' : 'joueur');
    }

    if (pData.getBoolean('muted')) {
        player.tell(Text.red('Vous êtes toujours muet(te).'));
    }

    if (hasRank(player, 'modo') || player.hasPermissions(2)) {
        let reports = JsonIO.read('kubejs/data/reports.json');
        if (reports && reports.length > 0) {
            player.tell(Text.darkRed('🚨 ATTENTION : ')
                .append(Text.red(`Il y a actuellement ${reports.length} report(s) non traité(s). `))
                .append(Text.yellow('[CLIQUEZ ICI POUR LES VOIR]')
                    .click('run_command', '/reports')
                    .hover('Ouvrir le menu des tickets')));
        }
    }
});

ServerEvents.tick(event => {
    const { server } = event
    if (server.tickCount % 5 === 0) {
        server.players.forEach(player => {
            const pData = player.persistentData
            if (pData.getBoolean('frozen')) {
                const x = pData.getDouble('frozenX')
                const y = pData.getDouble('frozenY')
                const z = pData.getDouble('frozenZ')
                server.runCommandSilent(`tp ${player.username} ${x} ${y} ${z}`)
            }
        })
    }
})

// Interception du tchat public
PlayerEvents.chat(event => {
    if (event.player.persistentData.getBoolean('muted')) {
        event.cancel()
        event.player.tell(Text.red('Vous ne pouvez pas écrire dans le chat : vous êtes muet(te).'))
    }
})

// Interception des messages privés (boucher la faille)
ServerEvents.command(event => {
    const player = event.parseResults.context.source.player;
    if (!player) return; 

    if (player.persistentData.getBoolean('muted')) {
        const cmd = event.parseResults.reader.string.toLowerCase();
        
        if (cmd.startsWith('msg ') || cmd.startsWith('tell ') || cmd.startsWith('w ') || cmd.startsWith('me ')) {
            event.cancel(); 
            player.tell(Text.red('Vous ne pouvez pas envoyer de messages privés : vous êtes muet(te).'));
        }
    }
});

// ============================================================
//  REGISTRE DES COMMANDES
// ============================================================

ServerEvents.commandRegistry(event => {
    const { commands: Commands, arguments: Arguments } = event

    // ===== SYSTÈME DE TICKETING / REPORT =====

    event.register(
        Commands.literal('report')
            .then(Commands.argument('probleme', RankSysStringArgType().greedyString())
                .executes(ctx => {
                    const reporter = ctx.source.player;
                    if (!reporter) return 0;
                    
                    const probleme = RankSysStringArgType().getString(ctx, 'probleme');
                    
                    const ticket = {
                        date: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
                        reporter: reporter.username,
                        probleme: probleme
                    };

                    let reports = JsonIO.read('kubejs/data/reports.json');
                    if (!reports) reports = [];
                    reports.push(ticket);
                    JsonIO.write('kubejs/data/reports.json', reports);
                    
                    const total = reports.length;

                    reporter.tell(Text.green('Votre ticket a bien été enregistré. L\'équipe s\'en chargera rapidement.'));
                    
                    const server = ctx.source.server;
                    server.players.forEach(p => {
                        if (hasRank(p, 'modo') || p.hasPermissions(2)) {
                            p.tell(Text.darkRed('🚨 [NOUVEAU TICKET] ')
                                .append(Text.yellow(reporter.username))
                                .append(Text.gray(' a signalé un problème.')));
                            p.tell(Text.red(`Attention : Il y a ${total} report(s) non traité(s). `)
                                .append(Text.yellow('[OUVRIR LE MENU]')
                                    .click('run_command', '/reports')));
                            
                            p.server.runCommandSilent(`playsound minecraft:block.note_block.pling master ${p.username}`);
                        }
                    });

                    return 1;
                })
            )
    )

    event.register(
        Commands.literal('reports')
            .requires(requireRankFor('reports'))
            .executes(ctx => {
                const moderator = ctx.source.player;
                if (!moderator) return 0;

                let reports = JsonIO.read('kubejs/data/reports.json');
                
                if (!reports || reports.length === 0) {
                    moderator.tell(Text.green('Aucun ticket en attente. Bon travail !'));
                    return 1;
                }

                moderator.tell(Text.gold(`╔═════ Tickets en attente (${reports.length}) ═════`));
                
                reports.forEach((ticket, index) => {
                    let ticketText = Text.yellow(`[#${index + 1}] `)
                        .append(Text.gray(`${ticket.date} - `))
                        .append(Text.aqua(`${ticket.reporter} `))
                        .append(Text.white(`: ${ticket.probleme} `))
                        .append(Text.green(' [TRAITER]')
                            .hover('Cliquez pour marquer ce ticket comme RÉSOLU et le supprimer')
                            .click('run_command', `/reports clear ${index + 1}`)
                        );
                        
                    moderator.tell(ticketText);
                });
                moderator.tell(Text.gold(`╚═════════════════════════════════`));

                return 1;
            })
            .then(Commands.literal('clear')
                .then(Commands.argument('id', RankSysIntegerArgumentType().integer(1))
                    .executes(ctx => {
                        const moderator = ctx.source.player;
                        const id = RankSysIntegerArgumentType().getInteger(ctx, 'id');
                        
                        let reports = JsonIO.read('kubejs/data/reports.json');
                        if (!reports || id > reports.length) {
                            if (moderator) moderator.tell(Text.red('ID de ticket invalide.'));
                            return 0;
                        }

                        reports.splice(id - 1, 1);
                        JsonIO.write('kubejs/data/reports.json', reports);

                        if (moderator) {
                            moderator.tell(Text.green(`Le ticket #${id} a été traité et supprimé avec succès.`));
                            moderator.server.runCommandSilent(`execute as ${moderator.username} run reports`);
                        }
                        return 1;
                    })
                )
            )
    )

    // ===== MODSTAFF ET RANGS =====

    event.register(
        Commands.literal('modstaff')
            .requires(requireRankFor('modstaff'))
            .executes(ctx => {
                if (ctx.source.player) toggleStaffMode(ctx.source.player);
                return 1;
            })
    )

    const rankChoice = rankId => Commands.literal(rankId).executes(ctx => {
        const target = Arguments.PLAYER.getResult(ctx, 'cible')
        const serverInstance = ctx.source.server || (ctx.source.player ? ctx.source.player.server : null)
        
        setRank(serverInstance, target, rankId)
        target.tell(Text.gold(`Votre rang a été changé en : ${rankId}`))
        
        if (ctx.source.player) ctx.source.player.tell(Text.green(`${target.username} est maintenant ${rankId}.`))
        else console.log(`${target.username} est maintenant ${rankId}.`)
        
        return 1
    })

    event.register(
        Commands.literal('rank')
            .then(Commands.literal('set')
                .requires(requireRankFor('rank_set'))
                .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                    .then(rankChoice('fondateur'))
                    .then(rankChoice('admin'))
                    .then(rankChoice('modo'))
                    .then(rankChoice('joueur'))
                )
            )
            .then(Commands.literal('info')
                .executes(ctx => {
                    if (ctx.source.player) ctx.source.player.tell(Text.gray('Votre rang : ' + getRank(ctx.source.player)))
                    return 1
                })
            )
            .then(Commands.literal('claim')
                .requires(src => src.player != null && src.player.hasPermissions(4))
                .executes(ctx => {
                    const serverInstance = ctx.source.server || ctx.source.player.server
                    setRank(serverInstance, ctx.source.player, 'fondateur')
                    ctx.source.player.tell(Text.gold('Vous êtes maintenant Fondateur.'))
                    return 1
                })
            )
    )

    // ===== MODÉRATION EN JEU =====

    event.register(
        Commands.literal('modmute')
            .requires(requireRankFor('modmute'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    target.persistentData.putBoolean('muted', true)
                    target.tell(Text.red('Vous avez été rendu muet(te) par la modération.'))
                    if (ctx.source.player) ctx.source.player.tell(Text.gray(`${target.username} est maintenant muet(te).`))
                    return 1
                })
            )
    )

    event.register(
        Commands.literal('modunmute')
            .requires(requireRankFor('modunmute'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    target.persistentData.putBoolean('muted', false)
                    target.tell(Text.green('Vous pouvez de nouveau écrire dans le chat.'))
                    if (ctx.source.player) ctx.source.player.tell(Text.gray(`${target.username} n'est plus muet(te).`))
                    return 1
                })
            )
    )

    event.register(
        Commands.literal('modfreeze')
            .requires(requireRankFor('modfreeze'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    const pData = target.persistentData
                    pData.putBoolean('frozen', true)
                    pData.putDouble('frozenX', target.x)
                    pData.putDouble('frozenY', target.y)
                    pData.putDouble('frozenZ', target.z)
                    target.tell(Text.red('Vous êtes figé(e) par la modération.'))
                    if (ctx.source.player) ctx.source.player.tell(Text.gray(`${target.username} est figé(e).`))
                    return 1
                })
            )
    )

    event.register(
        Commands.literal('modunfreeze')
            .requires(requireRankFor('modunfreeze'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    target.persistentData.putBoolean('frozen', false)
                    target.tell(Text.green('Vous pouvez de nouveau vous déplacer.'))
                    if (ctx.source.player) ctx.source.player.tell(Text.gray(`${target.username} n'est plus figé(e).`))
                    return 1
                })
            )
    )

    event.register(
        Commands.literal('modwarn')
            .requires(requireRankFor('modwarn'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .then(Commands.argument('raison', RankSysStringArgType().greedyString())
                    .executes(ctx => {
                        const target = Arguments.PLAYER.getResult(ctx, 'cible')
                        const raison = RankSysStringArgType().getString(ctx, 'raison')
                        
                        let warns = getPlayerWarns(target)
                        warns.push(raison)
                        savePlayerWarns(target, warns)
                        
                        const total = warns.length
                        target.tell(Text.gold(`Avertissement (${total}) : ${raison}`))
                        if (ctx.source.player) ctx.source.player.tell(Text.gray(`${target.username} a été averti.`))
                        return 1
                    })
                )
            )
    )

    event.register(
        Commands.literal('modwarns')
            .requires(requireRankFor('modwarns'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    let warns = getPlayerWarns(target)
                    const total = warns.length
                    
                    if (total === 0) {
                        if (ctx.source.player) ctx.source.player.tell(Text.green(`${target.username} n'a aucun avertissement.`))
                    } else {
                        if (ctx.source.player) {
                            ctx.source.player.tell(Text.gold(`--- Avertissements de ${target.username} (${total}) ---`))
                            for (let i = 0; i < total; i++) {
                                ctx.source.player.tell(Text.yellow(`[ID: ${i + 1}] `).append(Text.white(warns[i])))
                            }
                        }
                    }
                    return 1
                })
            )
    )

    event.register(
        Commands.literal('modunwarn')
            .requires(requireRankFor('modunwarn'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .then(Commands.literal('all').executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    target.persistentData.remove('warnsJson')
                    if (ctx.source.player) ctx.source.player.tell(Text.green(`Tous les avertissements de ${target.username} ont été supprimés.`))
                    return 1
                }))
                .then(Commands.argument('id', RankSysIntegerArgumentType().integer(1))
                    .executes(ctx => {
                        const target = Arguments.PLAYER.getResult(ctx, 'cible')
                        const id = RankSysIntegerArgumentType().getInteger(ctx, 'id')
                        let warns = getPlayerWarns(target)
                        
                        if (id > warns.length || id < 1) {
                            if (ctx.source.player) ctx.source.player.tell(Text.red(`ID invalide. Ce joueur possède ${warns.length} warn(s).`))
                            return 0;
                        }
                        
                        const removedWarn = warns.splice(id - 1, 1)[0]
                        savePlayerWarns(target, warns)
                        
                        if (ctx.source.player) ctx.source.player.tell(Text.green(`Avertissement supprimé avec succès : "${removedWarn}"`))
                        return 1
                    })
                )
            )
    )

    event.register(
        Commands.literal('modtp')
            .requires(requireRankFor('modtp'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    const serverInstance = ctx.source.server || ctx.source.player.server
                    serverInstance.runCommandSilent(`tp ${ctx.source.player.username} ${target.username}`)
                    return 1
                })
            )
    )

    event.register(
        Commands.literal('modkick')
            .requires(requireRankFor('modkick'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    const serverInstance = ctx.source.server || ctx.source.player.server
                    serverInstance.runCommandSilent(`kick ${target.username} Expulsé par la modération/administration`)
                    return 1
                })
                .then(Commands.argument('raison', RankSysStringArgType().greedyString())
                    .executes(ctx => {
                        const target = Arguments.PLAYER.getResult(ctx, 'cible')
                        const raison = RankSysStringArgType().getString(ctx, 'raison')
                        const serverInstance = ctx.source.server || ctx.source.player.server
                        serverInstance.runCommandSilent(`kick ${target.username} ${raison}`)
                        return 1
                    })
                )
            )
    )

    event.register(
        Commands.literal('modban')
            .requires(requireRankFor('modban'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    const serverInstance = ctx.source.server || ctx.source.player.server
                    serverInstance.runCommandSilent(`ban ${target.username} Banni du serveur`)
                    return 1
                })
                .then(Commands.argument('raison', RankSysStringArgType().greedyString())
                    .executes(ctx => {
                        const target = Arguments.PLAYER.getResult(ctx, 'cible')
                        const raison = RankSysStringArgType().getString(ctx, 'raison')
                        const serverInstance = ctx.source.server || ctx.source.player.server
                        serverInstance.runCommandSilent(`ban ${target.username} ${raison}`)
                        return 1
                    })
                )
            )
    )

    event.register(
        Commands.literal('modunban')
            .requires(requireRankFor('modunban'))
            .then(Commands.argument('pseudo', RankSysStringArgType().word())
                .executes(ctx => {
                    const pseudo = RankSysStringArgType().getString(ctx, 'pseudo')
                    const serverInstance = ctx.source.server || ctx.source.player.server
                    serverInstance.runCommandSilent(`pardon ${pseudo}`)
                    if (ctx.source.player) ctx.source.player.tell(Text.gray(`${pseudo} a été débanni.`))
                    return 1
                })
            )
    )

    event.register(
        Commands.literal('modgm')
            .requires(requireRankFor('modgm'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .then(Commands.literal('survival').executes(ctx => doGamemode(ctx.source.server || ctx.source.player.server, ctx, Arguments, 'survival')))
                .then(Commands.literal('creative').executes(ctx => doGamemode(ctx.source.server || ctx.source.player.server, ctx, Arguments, 'creative')))
                .then(Commands.literal('spectator').executes(ctx => doGamemode(ctx.source.server || ctx.source.player.server, ctx, Arguments, 'spectator')))
                .then(Commands.literal('adventure').executes(ctx => doGamemode(ctx.source.server || ctx.source.player.server, ctx, Arguments, 'adventure')))
            )
    )

    event.register(
        Commands.literal('modclear')
            .requires(requireRankFor('modclear'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible');
                    
                    if (target.persistentData.getBoolean('staffMode')) {
                        if (ctx.source.player) {
                            ctx.source.player.tell(Text.red(`Action annulée : Vous ne pouvez pas clear un membre du staff en service.`));
                        }
                        return 0;
                    }
                    
                    const serverInstance = ctx.source.server || ctx.source.player.server;
                    serverInstance.runCommandSilent(`clear ${target.username}`);
                    
                    if (ctx.source.player) {
                        ctx.source.player.tell(Text.green(`L'inventaire de ${target.username} a été vidé.`));
                    }
                    return 1;
                })
            )
    )

    event.register(
        Commands.literal('modheal')
            .requires(requireRankFor('modheal'))
            .then(Commands.argument('cible', Arguments.PLAYER.create(event))
                .executes(ctx => {
                    const target = Arguments.PLAYER.getResult(ctx, 'cible')
                    target.heal(20)
                    target.tell(Text.green('Vous avez été soigné(e).'))
                    return 1
                })
            )
    )

    event.register(
        Commands.literal('broadcast')
            .requires(requireRankFor('broadcast'))
            .then(Commands.argument('message', RankSysStringArgType().greedyString())
                .executes(ctx => {
                    const message = RankSysStringArgType().getString(ctx, 'message')
                    const serverInstance = ctx.source.server || ctx.source.player.server
                    serverInstance.players.forEach(p => p.tell(Text.gold('[Annonce] ').append(Text.white(message))))
                    return 1
                })
            )
    )

    event.register(
        Commands.literal('a')
            .requires(requireRankFor('admin_chat'))
            .then(Commands.argument('message', RankSysStringArgType().greedyString())
                .executes(ctx => {
                    const sender = ctx.source.player
                    const message = RankSysStringArgType().getString(ctx, 'message')
                    const minRankRequired = RankSys_COMMAND_PERMISSIONS['admin_chat']
                    const serverInstance = ctx.source.server || (ctx.source.player ? ctx.source.player.server : null)
                    
                    if (sender && serverInstance) {
                        serverInstance.players.forEach(p => {
                            if (hasRank(p, minRankRequired)) {
                                p.tell(Text.darkRed('[AdminChat] ')
                                    .append(Text.gray(`${sender.username}: `))
                                    .append(Text.white(message)))
                            }
                        })
                    }
                    return 1
                })
            )
    )
})