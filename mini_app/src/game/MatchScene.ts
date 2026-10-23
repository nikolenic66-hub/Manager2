import Phaser from 'phaser';
import type { MatchEvent, MatchVisualPlayer, MatchVisualState, NextMatch } from '../api';

type Side = 'HOME' | 'AWAY';
type Vec = { x: number; y: number };
type FormationSlot = { role: string; x: number; y: number };
type Actor = {
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Ellipse;
  jersey: Phaser.GameObjects.Rectangle;
  stripe: Phaser.GameObjects.Rectangle;
  head: Phaser.GameObjects.Arc;
  leftLeg: Phaser.GameObjects.Rectangle;
  rightLeg: Phaser.GameObjects.Rectangle;
  leftArm: Phaser.GameObjects.Rectangle;
  rightArm: Phaser.GameObjects.Rectangle;
  numberText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  side: Side;
  index: number;
  role: string;
  playerId: number | null;
  playerName: string;
  anchor: Vec;
  pos: Vec;
  velocity: Vec;
  target: Vec;
  actionTarget: Vec | null;
  actionUntil: number;
  phase: number;
  keeper: boolean;
  retiring: boolean;
};
type BallMotion = {
  from: Vec;
  control: Vec;
  to: Vec;
  elapsed: number;
  duration: number;
  arc: number;
  kind: string;
  outcome: string;
  side: Side | null;
};
type VisualEvent = MatchEvent & { secondary_player_id?: number | null };
type EventPoint = Vec | null;

const FORMATIONS: Record<string, FormationSlot[]> = {
  '4-3-3': [
    { role: 'GK', x: 50, y: 8 }, { role: 'LB', x: 15, y: 25 }, { role: 'CB', x: 38, y: 25 },
    { role: 'CB', x: 62, y: 25 }, { role: 'RB', x: 85, y: 25 }, { role: 'CM', x: 30, y: 48 },
    { role: 'DM', x: 50, y: 45 }, { role: 'CM', x: 70, y: 48 }, { role: 'LW', x: 15, y: 72 },
    { role: 'ST', x: 50, y: 82 }, { role: 'RW', x: 85, y: 72 },
  ],
  '4-4-2': [
    { role: 'GK', x: 50, y: 8 }, { role: 'LB', x: 15, y: 25 }, { role: 'CB', x: 38, y: 25 },
    { role: 'CB', x: 62, y: 25 }, { role: 'RB', x: 85, y: 25 }, { role: 'LM', x: 15, y: 48 },
    { role: 'CM', x: 38, y: 48 }, { role: 'CM', x: 62, y: 48 }, { role: 'RM', x: 85, y: 48 },
    { role: 'ST', x: 40, y: 80 }, { role: 'ST', x: 60, y: 80 },
  ],
  '4-2-3-1': [
    { role: 'GK', x: 50, y: 8 }, { role: 'LB', x: 15, y: 25 }, { role: 'CB', x: 38, y: 25 },
    { role: 'CB', x: 62, y: 25 }, { role: 'RB', x: 85, y: 25 }, { role: 'DM', x: 40, y: 45 },
    { role: 'DM', x: 60, y: 45 }, { role: 'LW', x: 18, y: 67 }, { role: 'AM', x: 50, y: 67 },
    { role: 'RW', x: 82, y: 67 }, { role: 'ST', x: 50, y: 82 },
  ],
  '3-5-2': [
    { role: 'GK', x: 50, y: 8 }, { role: 'CB', x: 30, y: 25 }, { role: 'CB', x: 50, y: 25 },
    { role: 'CB', x: 70, y: 25 }, { role: 'LM', x: 10, y: 48 }, { role: 'CM', x: 35, y: 48 },
    { role: 'DM', x: 50, y: 45 }, { role: 'CM', x: 65, y: 48 }, { role: 'RM', x: 90, y: 48 },
    { role: 'ST', x: 40, y: 80 }, { role: 'ST', x: 60, y: 80 },
  ],
  '5-3-2': [
    { role: 'GK', x: 50, y: 8 }, { role: 'LB', x: 10, y: 25 }, { role: 'CB', x: 30, y: 25 },
    { role: 'CB', x: 50, y: 25 }, { role: 'CB', x: 70, y: 25 }, { role: 'RB', x: 90, y: 25 },
    { role: 'CM', x: 32, y: 50 }, { role: 'DM', x: 50, y: 48 }, { role: 'CM', x: 68, y: 50 },
    { role: 'ST', x: 40, y: 80 }, { role: 'ST', x: 60, y: 80 },
  ],
  '4-1-2-1-2': [
    { role: 'GK', x: 50, y: 8 }, { role: 'LB', x: 15, y: 25 }, { role: 'CB', x: 38, y: 25 },
    { role: 'CB', x: 62, y: 25 }, { role: 'RB', x: 85, y: 25 }, { role: 'DM', x: 50, y: 42 },
    { role: 'CM', x: 38, y: 54 }, { role: 'CM', x: 62, y: 54 }, { role: 'AM', x: 50, y: 67 },
    { role: 'ST', x: 40, y: 82 }, { role: 'ST', x: 60, y: 82 },
  ],
  '4-3-1-2': [
    { role: 'GK', x: 50, y: 8 }, { role: 'LB', x: 15, y: 25 }, { role: 'CB', x: 38, y: 25 },
    { role: 'CB', x: 62, y: 25 }, { role: 'RB', x: 85, y: 25 }, { role: 'CM', x: 30, y: 48 },
    { role: 'CM', x: 50, y: 48 }, { role: 'CM', x: 70, y: 48 }, { role: 'AM', x: 50, y: 67 },
    { role: 'ST', x: 40, y: 82 }, { role: 'ST', x: 60, y: 82 },
  ],
  '4-5-1': [
    { role: 'GK', x: 50, y: 8 }, { role: 'LB', x: 15, y: 25 }, { role: 'CB', x: 38, y: 25 },
    { role: 'CB', x: 62, y: 25 }, { role: 'RB', x: 85, y: 25 }, { role: 'LM', x: 12, y: 50 },
    { role: 'CM', x: 35, y: 50 }, { role: 'CM', x: 50, y: 47 }, { role: 'CM', x: 65, y: 50 },
    { role: 'RM', x: 88, y: 50 }, { role: 'ST', x: 50, y: 82 },
  ],
  '3-4-3': [
    { role: 'GK', x: 50, y: 8 }, { role: 'CB', x: 30, y: 25 }, { role: 'CB', x: 50, y: 25 },
    { role: 'CB', x: 70, y: 25 }, { role: 'LM', x: 12, y: 50 }, { role: 'CM', x: 38, y: 50 },
    { role: 'CM', x: 62, y: 50 }, { role: 'RM', x: 88, y: 50 }, { role: 'LW', x: 18, y: 73 },
    { role: 'ST', x: 50, y: 82 }, { role: 'RW', x: 82, y: 73 },
  ],
  '4-1-4-1': [
    { role: 'GK', x: 50, y: 8 }, { role: 'LB', x: 15, y: 25 }, { role: 'CB', x: 38, y: 25 },
    { role: 'CB', x: 62, y: 25 }, { role: 'RB', x: 85, y: 25 }, { role: 'DM', x: 50, y: 43 },
    { role: 'LM', x: 15, y: 60 }, { role: 'CM', x: 38, y: 60 }, { role: 'CM', x: 62, y: 60 },
    { role: 'RM', x: 85, y: 60 }, { role: 'ST', x: 50, y: 82 },
  ],
};

const DEFAULT_SLOTS = FORMATIONS['4-3-3'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: unknown): number | null => {
  const parsed = Number(value);
  return value !== null && value !== undefined && Number.isFinite(parsed) ? parsed : null;
};
const upper = (value: unknown) => String(value ?? '').trim().toUpperCase();

/**
 * Match renderer inspired by the strongest patterns in open football sims:
 * fixed-step motion (soccer-js), event-driven football actions and broadcast
 * polish (2d-soccer-ai), plus the simulation/render split (footballsim-demo).
 * Server events remain the source of truth; this scene only interpolates them.
 */
export class MatchScene extends Phaser.Scene {
  private homePlayers: Actor[] = [];
  private awayPlayers: Actor[] = [];
  private homeFormation = '4-3-3';
  private awayFormation = '4-3-3';
  private homeClubId: number | null = null;
  private awayClubId: number | null = null;
  private playerActors = new Map<number, Actor>();
  private ball!: Phaser.GameObjects.Container;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private ballCore!: Phaser.GameObjects.Arc;
  private ballSeam!: Phaser.GameObjects.Graphics;
  private trail: Phaser.GameObjects.Ellipse[] = [];
  private trailCursor = 0;
  private fieldGraphics: Phaser.GameObjects.Graphics | null = null;
  private eventBadge!: Phaser.GameObjects.Container;
  private eventBadgeText!: Phaser.GameObjects.Text;
  private possessionBadge!: Phaser.GameObjects.Container;
  private possessionText!: Phaser.GameObjects.Text;
  private possessionBackground!: Phaser.GameObjects.Rectangle;
  private goalFlash!: Phaser.GameObjects.Rectangle;
  private lastWidth = 360;
  private lastHeight = 470;
  private fieldRect = { x: 18, y: 12, width: 324, height: 446 };
  private gameTime = 0;
  private accumulator = 0;
  private hasInitialSnapshot = false;
  private processedEvents = new Set<string>();
  private eventQueue: VisualEvent[] = [];
  private nextEventAt = 0;
  private ballMotion: BallMotion | null = null;
  private settlingEvent: VisualEvent | null = null;
  private ballPos: Vec = { x: 50, y: 50 };
  private possessionSide: Side | null = null;
  private carrier: Actor | null = null;
  private pendingGoalSide: Side | null = null;
  private pendingGoalOutcome = '';
  private lastGoalAt = -10000;
  private lastGoalSide: Side | null = null;
  private crowdPulse = 0;
  private homeShots = 0;
  private awayShots = 0;
  private homePossession = 50;
  private celebrationUntil = 0;

  constructor() {
    super('MatchScene');
  }

  create() {
    this.lastWidth = Math.max(1, this.scale.width || 360);
    this.lastHeight = Math.max(1, this.scale.height || 470);
    this.drawPitch();
    this.createBall();
    this.createEffects();
    this.createTeam('HOME', DEFAULT_SLOTS, []);
    this.createTeam('AWAY', DEFAULT_SLOTS, []);
    this.setBallPosition({ x: 50, y: 50 }, 0);
    this.scale.off('resize', this.handleResize, this);
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      this.processedEvents.clear();
      this.eventQueue = [];
      this.settlingEvent = null;
      this.playerActors.clear();
    });
  }

  /** Consume a fresh API snapshot without resetting scene, players, clock or tweens. */
  syncSnapshot(match: NextMatch | null) {
    if (!match) return;
    this.setTeams(match.home_club_id, match.away_club_id);
    const homePossession = finite(match.home_possession);
    if (homePossession !== null) this.homePossession = clamp(homePossession, 0, 100);
    if (match.visual) this.syncVisualState(match.visual);
    const allEvents = [...(match.events ?? [])].sort((a, b) => Number(a.minute || 0) - Number(b.minute || 0) || Number(a.id || 0) - Number(b.id || 0)) as VisualEvent[];
    // The server keeps both a scored GOAL record and its preceding SHOT(result=GOAL).
    // Animate the shot into the net once; retain the bare GOAL only when no visual
    // shot accompanies it (for example a legacy or penalty event).
    const goalShots = new Set(allEvents.filter((event) => {
      if (upper(event.event_type) !== 'SHOT') return false;
      const meta = this.readMetadata(event.metadata);
      return upper(meta.result ?? meta.outcome) === 'GOAL';
    }).map((event) => `${Number(event.minute || 0)}|${Number(event.club_id || 0)}`));
    const events = allEvents.filter((event) => !(upper(event.event_type) === 'GOAL' &&
      goalShots.has(`${Number(event.minute || 0)}|${Number(event.club_id || 0)}`)));
    if (!this.hasInitialSnapshot) {
      this.hasInitialSnapshot = true;
      const currentMinute = Number(match.current_minute || 0);
      const latestAction = [...events].reverse().find((event) => this.isPitchAction(event));
      const latestAge = latestAction ? currentMinute - Number(latestAction.minute || 0) : Number.POSITIVE_INFINITY;
      const mayReplayLatest = !!latestAction && currentMinute > 0 && latestAge >= 0 && latestAge <= 1;
      const latestKey = latestAction ? this.getEventKey(latestAction) : '';
      for (const event of events) {
        const key = this.getEventKey(event);
        if (mayReplayLatest && key === latestKey) {
          this.processedEvents.add(key);
          this.eventQueue.push(event);
        } else {
          this.processedEvents.add(key);
        }
      }
      if (!mayReplayLatest) this.restoreLatestState(events);
      this.trimProcessedEvents();
      return;
    }

    const fresh: VisualEvent[] = [];
    for (const event of events) {
      const key = this.getEventKey(event);
      if (this.processedEvents.has(key)) continue;
      this.processedEvents.add(key);
      fresh.push(event);
    }
    if (fresh.length) {
      // If the phone was backgrounded and a lot of events landed, skip stale
      // animations and catch up to the newest state instead of playing a queue
      // of old passes on top of the live moment.
      if (this.eventQueue.length + fresh.length > 6) {
        this.eventQueue = [];
        this.restoreLatestState(events);
        const last = fresh[fresh.length - 1];
        if (Number(match.current_minute || 0) - Number(last.minute || 0) <= 1 && this.isPitchAction(last)) {
          this.eventQueue.push(last);
        }
      } else {
        this.eventQueue.push(...fresh);
      }
    }
    this.trimProcessedEvents();
  }

  setTeams(homeClubId: number, awayClubId: number) {
    this.homeClubId = Number(homeClubId) || null;
    this.awayClubId = Number(awayClubId) || null;
  }

  private syncVisualState(visual: MatchVisualState) {
    const nextHomeFormation = FORMATIONS[visual.home_formation] ? visual.home_formation : '4-3-3';
    const nextAwayFormation = FORMATIONS[visual.away_formation] ? visual.away_formation : '4-3-3';
    if (nextHomeFormation !== this.homeFormation) {
      this.homeFormation = nextHomeFormation;
      this.reconcileTeam('HOME', FORMATIONS[this.homeFormation], visual.home_players ?? []);
    } else if (visual.home_players?.length) {
      this.reconcileTeam('HOME', FORMATIONS[this.homeFormation], visual.home_players);
    }
    if (nextAwayFormation !== this.awayFormation) {
      this.awayFormation = nextAwayFormation;
      this.reconcileTeam('AWAY', FORMATIONS[this.awayFormation], visual.away_players ?? []);
    } else if (visual.away_players?.length) {
      this.reconcileTeam('AWAY', FORMATIONS[this.awayFormation], visual.away_players);
    }
  }

  private reconcileTeam(side: Side, slots: FormationSlot[], roster: MatchVisualPlayer[]) {
    const oldActors = side === 'HOME' ? this.homePlayers : this.awayPlayers;
    const actorsById = new Map<number, Actor>();
    for (const actor of oldActors) if (actor.playerId !== null) actorsById.set(actor.playerId, actor);
    const claimed = new Set<Actor>();
    const orderedRoster = this.orderRoster(slots, roster);
    const next: Actor[] = [];
    for (let i = 0; i < 11; i += 1) {
      const slot = slots[i] ?? DEFAULT_SLOTS[i];
      const player = orderedRoster[i];
      let actor = player ? actorsById.get(Number(player.id)) : undefined;
      if (actor && claimed.has(actor)) actor = undefined;
      if (!actor) {
        // Reuse an unclaimed actor (especially when replacing a placeholder or
        // on a substitution) to avoid destroying and rebuilding the scene.
        actor = oldActors.find((candidate) => !claimed.has(candidate) && (candidate.playerId === null || !orderedRoster.some((entry) => Number(entry.id) === candidate.playerId)));
      }
      const anchor = this.slotForSide(slot, side);
      if (!actor) actor = this.createActor(side, i, slot, anchor, player);
      claimed.add(actor);
      actor.side = side;
      actor.index = i;
      actor.role = String(player?.role || slot.role || player?.position || 'CM').toUpperCase();
      actor.keeper = actor.role === 'GK' || slot.role === 'GK';
      actor.anchor = anchor;
      if (player) {
        actor.playerId = Number(player.id);
        actor.playerName = String(player.name || player.role || 'Игрок');
        actor.nameText.setText(actor.playerName);
        actor.numberText.setText(String(i + 1));
        this.playerActors.set(Number(player.id), actor);
      } else if (actor.playerId !== null && !orderedRoster.length) {
        this.playerActors.delete(actor.playerId);
        actor.playerId = null;
        actor.playerName = '';
        actor.nameText.setText('');
      }
      actor.retiring = false;
      actor.container.setAlpha(1);
      actor.target = { ...anchor };
      if (!next.includes(actor)) next.push(actor);
    }
    for (const actor of oldActors) {
      if (claimed.has(actor)) continue;
      if (actor.playerId !== null) this.playerActors.delete(actor.playerId);
      actor.container.destroy();
    }
    if (side === 'HOME') this.homePlayers = next;
    else this.awayPlayers = next;
  }

  private orderRoster(slots: FormationSlot[], roster: MatchVisualPlayer[]) {
    const roleOrder = new Map<string, number>();
    slots.forEach((slot, index) => {
      const role = String(slot.role).toUpperCase();
      if (!roleOrder.has(role)) roleOrder.set(role, index);
    });
    return [...roster].sort((a, b) => {
      const ar = roleOrder.get(String(a.role || a.position || '').toUpperCase()) ?? 99;
      const br = roleOrder.get(String(b.role || b.position || '').toUpperCase()) ?? 99;
      return ar - br || Number(a.id) - Number(b.id);
    }).slice(0, 11);
  }

  private createTeam(side: Side, slots: FormationSlot[], roster: MatchVisualPlayer[]) {
    const ordered = this.orderRoster(slots, roster);
    const result: Actor[] = [];
    for (let i = 0; i < 11; i += 1) {
      const slot = slots[i] ?? DEFAULT_SLOTS[i];
      const player = ordered[i];
      const actor = this.createActor(side, i, slot, this.slotForSide(slot, side), player);
      result.push(actor);
      if (player) this.playerActors.set(Number(player.id), actor);
    }
    if (side === 'HOME') this.homePlayers = result;
    else this.awayPlayers = result;
  }

  private createActor(side: Side, index: number, slot: FormationSlot, anchor: Vec, player?: MatchVisualPlayer) {
    const isHome = side === 'HOME';
    const keeper = String(player?.role || slot.role).toUpperCase() === 'GK';
    const jerseyColor = keeper ? (isHome ? 0xf5d84c : 0xffa23e) : (isHome ? 0x37b8ff : 0xff536d);
    const shortsColor = keeper ? (isHome ? 0xb58d16 : 0xb84b22) : (isHome ? 0x11517f : 0x811f3e);
    const accentColor = isHome ? 0xf4fcff : 0xffe9ed;
    const container = this.add.container(0, 0).setDepth(20);
    const ring = this.add.ellipse(0, 2, 26, 13, 0xffee70, 0).setStrokeStyle(1.6, 0xffeb70, 0.95).setVisible(false);
    const shadow = this.add.ellipse(0, 7, 17, 8, 0x00110b, 0.38);
    const leftLeg = this.add.rectangle(-3.1, 5, 3.4, 8.4, shortsColor).setOrigin(0.5, 0.12);
    const rightLeg = this.add.rectangle(3.1, 5, 3.4, 8.4, shortsColor).setOrigin(0.5, 0.12);
    const leftBoot = this.add.rectangle(-3.7, 12, 4.5, 2.6, 0xeaf5f2).setOrigin(0.5, 0.5);
    const rightBoot = this.add.rectangle(3.7, 12, 4.5, 2.6, 0xeaf5f2).setOrigin(0.5, 0.5);
    const leftArm = this.add.rectangle(-7.4, -2.2, 3.1, 8.4, jerseyColor).setOrigin(0.5, 0.1);
    const rightArm = this.add.rectangle(7.4, -2.2, 3.1, 8.4, jerseyColor).setOrigin(0.5, 0.1);
    const jersey = this.add.rectangle(0, -1, 12.4, 14.3, jerseyColor).setStrokeStyle(1, accentColor, 0.9);
    const stripe = this.add.rectangle(0, -1, 2.0, 13.0, accentColor, 0.72);
    const numberText = this.add.text(0, -1, String(index + 1), {
      fontFamily: 'Arial, sans-serif', fontSize: '7px', color: '#ffffff',
      stroke: '#0a2339', strokeThickness: 1, fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5, 0.5);
    const head = this.add.circle(0, -11.5, 4.4, 0xe9b995, 1).setStrokeStyle(0.75, 0xffffff, 0.9);
    const hair = this.add.arc(0, -13.0, 3.7, 188, 352, false, 0x293444, 1);
    const nameText = this.add.text(0, 15.5, player?.name ?? '', {
      fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#ffffff',
      backgroundColor: '#071a2ddd', padding: { x: 3, y: 2 }, align: 'center',
    }).setOrigin(0.5, 0).setVisible(false);
    container.add([ring, shadow, leftLeg, rightLeg, leftBoot, rightBoot, leftArm, rightArm, jersey, stripe, numberText, head, hair, nameText]);
    const actor: Actor = {
      container, shadow, ring, jersey, stripe, head, leftLeg, rightLeg, leftArm, rightArm, numberText, nameText,
      side, index, role: String(player?.role || slot.role).toUpperCase(), playerId: player ? Number(player.id) : null,
      playerName: String(player?.name || ''), anchor: { ...anchor }, pos: { ...anchor }, velocity: { x: 0, y: 0 },
      target: { ...anchor }, actionTarget: null, actionUntil: 0, phase: index * 1.7 + (isHome ? 0 : Math.PI), keeper, retiring: false,
    };
    container.setScale(this.actorScale());
    this.positionActor(actor);
    return actor;
  }

  private actorScale() {
    return clamp(Math.min(this.scale.width / 360, this.scale.height / 470), 0.76, 1.12);
  }

  private slotForSide(slot: FormationSlot, side: Side): Vec {
    return { x: slot.x, y: side === 'HOME' ? slot.y : 100 - slot.y };
  }

  private createBall() {
    this.ballShadow = this.add.ellipse(0, 0, 14, 7, 0x00130d, 0.42).setDepth(16);
    this.ball = this.add.container(0, 0).setDepth(30);
    this.ballCore = this.add.circle(0, 0, 4.3, 0xffffff, 1).setStrokeStyle(1, 0x1b2c39, 0.95);
    this.ballSeam = this.add.graphics();
    this.ballSeam.lineStyle(0.9, 0x202c38, 0.95);
    this.ballSeam.strokeCircle(0, 0, 2.5);
    this.ballSeam.lineBetween(-2.4, 0, 2.4, 0);
    this.ballSeam.lineBetween(0, -2.4, 0, 2.4);
    this.ball.add([this.ballCore, this.ballSeam]);
    for (let i = 0; i < 7; i += 1) {
      this.trail.push(this.add.ellipse(0, 0, 4 + i * 0.4, 4 + i * 0.4, 0xdffcff, 0).setDepth(18));
    }
  }

  private createEffects() {
    this.eventBadge = this.add.container(0, 0).setDepth(6000).setVisible(false);
    const badgeBack = this.add.rectangle(0, 0, 10, 28, 0x061a2b, 0.88).setStrokeStyle(1, 0x7cebd0, 0.5);
    this.eventBadgeText = this.add.text(0, 0, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#ffffff', fontStyle: 'bold', align: 'center',
      stroke: '#06203a', strokeThickness: 2, padding: { x: 7, y: 5 },
    }).setOrigin(0.5, 0.5);
    this.eventBadge.add([badgeBack, this.eventBadgeText]);
    this.eventBadge.setData('background', badgeBack);

    this.possessionBadge = this.add.container(0, 0).setDepth(5000);
    const possessionBack = this.add.rectangle(0, 0, 132, 22, 0x071a2c, 0.82).setStrokeStyle(1, 0xffffff, 0.12);
    this.possessionBackground = possessionBack;
    this.possessionText = this.add.text(0, 0, 'ВЛАДЕНИЕ  ·  50%', {
      fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#ecfffb', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5, 0.5);
    this.possessionBadge.add([possessionBack, this.possessionText]);

    this.goalFlash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(9000);
    this.positionHud();
  }

  update(_time: number, delta: number) {
    if (this.scale.width <= 0 || this.scale.height <= 0) return;
    // Fixed 60 Hz motion step, capped catch-up: the scene clock is never reset
    // by API polling and a WebView stall cannot cause a giant teleport.
    const frame = clamp(Number.isFinite(delta) ? delta : 0, 0, 50) / 1000;
    this.accumulator += frame;
    let steps = 0;
    const fixedStep = 1 / 60;
    while (this.accumulator >= fixedStep && steps < 3) {
      this.gameTime += fixedStep;
      this.stepSimulation(fixedStep);
      this.accumulator -= fixedStep;
      steps += 1;
    }
    if (steps >= 3) this.accumulator = Math.min(this.accumulator, fixedStep);
    this.advanceBall(frame);
    this.advanceTrail(frame);
    this.updateActorDepths();
    this.updateEffects(frame);
    this.processEventQueue();
  }

  private stepSimulation(dt: number) {
    this.crowdPulse += dt;
    const ball = this.ballPos;
    const moveSide = (actors: Actor[], side: Side) => {
      const attackingDirection = side === 'HOME' ? 1 : -1;
      const hasPossession = this.possessionSide === side;
      const ballProgress = (ball.y - 50) * attackingDirection;
      const commonShift = hasPossession ? clamp(ballProgress * 0.16, -6, 12) : clamp(ballProgress * 0.075, -6, 7);
      const lateralShift = clamp((ball.x - 50) * 0.13, -8, 8);
      const fieldDistance = (a: Vec, b: Vec) => {
        const dx = (a.x - b.x) * 0.82;
        const dy = a.y - b.y;
        return Math.hypot(dx, dy);
      };
      let nearestDefender: Actor | null = null;
      let secondDefender: Actor | null = null;
      if (!hasPossession) {
        const outfield = actors.filter((actor) => !actor.keeper && !actor.retiring);
        outfield.sort((a, b) => fieldDistance(a.pos, ball) - fieldDistance(b.pos, ball));
        nearestDefender = outfield[0] ?? null;
        secondDefender = outfield[1] ?? null;
      }

      for (const actor of actors) {
        if (!actor.container.active || actor.retiring) continue;
        const anchor = actor.anchor;
        let targetX = anchor.x + lateralShift * (hasPossession ? 0.82 : 0.5);
        let targetY = anchor.y + attackingDirection * commonShift;
        const isForward = /^(ST|LW|RW|CF|AM|LM|RM)$/.test(actor.role);
        const ballDistance = fieldDistance(actor.pos, ball);

        // Players react to the actual last-known ball position and possession,
        // not an arbitrary per-player sine wave. The back line moves as a unit.
        if (hasPossession) {
          if (actor === this.carrier) {
            targetX = ball.x - (side === 'HOME' ? -0.7 : 0.7);
            targetY = ball.y - attackingDirection * 0.4;
          } else {
            const supportBoost = isForward ? 0.11 : (/^(CM|DM|AM)$/.test(actor.role) ? 0.055 : 0.015);
            const ahead = clamp(ballProgress * supportBoost, -3, 10);
            targetY += attackingDirection * ahead;
            targetX += clamp((ball.x - anchor.x) * (isForward ? 0.1 : 0.045), -5, 5);
            if (actor === nearestDefender) targetY += attackingDirection * 2.4;
          }
        } else {
          // Only a couple of players actively press; teammates hold a compact
          // block and cover passing lanes rather than all chasing the ball.
          if (actor === nearestDefender) {
            targetX = ball.x;
            targetY = ball.y - attackingDirection * 1.8;
          } else if (actor === secondDefender && ballDistance < 28) {
            targetX = ball.x + (anchor.x < ball.x ? -5 : 5);
            targetY = ball.y - attackingDirection * 5.5;
          } else {
            targetX += clamp((ball.x - anchor.x) * 0.075, -4, 4);
            targetY -= attackingDirection * clamp((ballProgress > 0 ? ballProgress : ballProgress * 0.45) * 0.05, -3, 5);
          }
        }
        if (actor.keeper) {
          targetX = 50 + clamp((ball.x - 50) * 0.22, -7, 7);
          const ownGoal = side === 'HOME' ? 8 : 92;
          const danger = side === 'HOME' ? clamp((18 - ball.y) / 18, 0, 1) : clamp((ball.y - 82) / 18, 0, 1);
          targetY = ownGoal + (side === 'HOME' ? 1 : -1) * danger * 3;
        }
        // A short event-specific run (press, receive, shoot) temporarily wins
        // over the shape AI. It expires naturally and never freezes the actor.
        if (actor.actionTarget && this.gameTime < actor.actionUntil) {
          targetX = actor.actionTarget.x;
          targetY = actor.actionTarget.y;
        } else if (actor.actionTarget) {
          actor.actionTarget = null;
        }
        targetX = clamp(targetX, actor.keeper ? 30 : 5, actor.keeper ? 70 : 95);
        targetY = clamp(targetY, actor.keeper ? 3 : 5, actor.keeper ? 97 : 95);
        actor.target = { x: targetX, y: targetY };

        const dx = actor.target.x - actor.pos.x;
        const dy = actor.target.y - actor.pos.y;
        const dist = Math.hypot(dx, dy);
        const maxSpeed = actor.keeper ? 11 : (actor === this.carrier ? 20 : (isForward ? 17 : 13));
        const acceleration = 45;
        const desiredVX = dist > 0.25 ? (dx / dist) * Math.min(maxSpeed, dist * 2.5) : 0;
        const desiredVY = dist > 0.25 ? (dy / dist) * Math.min(maxSpeed, dist * 2.5) : 0;
        actor.velocity.x += clamp(desiredVX - actor.velocity.x, -acceleration * dt, acceleration * dt);
        actor.velocity.y += clamp(desiredVY - actor.velocity.y, -acceleration * dt, acceleration * dt);
        actor.pos.x = clamp(actor.pos.x + actor.velocity.x * dt, 2, 98);
        actor.pos.y = clamp(actor.pos.y + actor.velocity.y * dt, 2, 98);
        if (dist < 0.18) {
          actor.pos.x = actor.target.x;
          actor.pos.y = actor.target.y;
          actor.velocity.x *= 0.5;
          actor.velocity.y *= 0.5;
        }
        actor.phase += dt * (1.8 + Math.hypot(actor.velocity.x, actor.velocity.y) * 0.24);
        this.positionActor(actor);
        const gait = clamp(Math.hypot(actor.velocity.x, actor.velocity.y) / 12, 0, 1);
        actor.leftLeg.rotation = Math.sin(actor.phase) * 0.48 * gait;
        actor.rightLeg.rotation = Math.sin(actor.phase + Math.PI) * 0.48 * gait;
        actor.leftArm.rotation = Math.sin(actor.phase + Math.PI) * 0.16 * gait;
        actor.rightArm.rotation = Math.sin(actor.phase) * 0.16 * gait;
        actor.container.y -= Math.abs(Math.sin(actor.phase * 2)) * gait * 0.25;
        const ownsBall = actor === this.carrier && this.possessionSide === actor.side && !this.ballMotion;
        actor.ring.setVisible(ownsBall);
        if (ownsBall) {
          actor.ring.setAlpha(0.68 + Math.sin(this.gameTime * 5) * 0.18);
          actor.nameText.setVisible(true);
          actor.nameText.setAlpha(0.88 + Math.sin(this.gameTime * 4) * 0.08);
        } else {
          actor.nameText.setVisible(false);
        }
      }
    };
    moveSide(this.homePlayers, 'HOME');
    moveSide(this.awayPlayers, 'AWAY');
    this.resolveCrowding();
    if (!this.ballMotion && this.carrier && this.possessionSide === this.carrier.side) {
      const footOffset = this.carrier.side === 'HOME' ? 0.65 : -0.65;
      const targetBall = { x: clamp(this.carrier.pos.x + 0.7, 2, 98), y: clamp(this.carrier.pos.y + footOffset, 2, 98) };
      // Keep the ball attached to the dribbler with a tiny, stable trailing lag
      // instead of snapping it to a new coordinate every physics frame.
      const follow = clamp(dt * 12, 0, 1);
      this.ballPos = {
        x: this.ballPos.x + (targetBall.x - this.ballPos.x) * follow,
        y: this.ballPos.y + (targetBall.y - this.ballPos.y) * follow,
      };
      this.setBallPosition(this.ballPos, 0);
    }
  }

  private resolveCrowding() {
    const actors = [...this.homePlayers, ...this.awayPlayers].filter((actor) => actor.container.active && !actor.retiring);
    const minDistance = 3.05;
    for (let i = 0; i < actors.length; i += 1) {
      for (let j = i + 1; j < actors.length; j += 1) {
        const a = actors[i];
        const b = actors[j];
        let dx = (b.pos.x - a.pos.x) * 0.82;
        let dy = b.pos.y - a.pos.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= minDistance) continue;
        if (distance < 0.001) {
          // Stable fallback direction prevents division by zero and frame-to-
          // frame random jitter when two targets momentarily coincide.
          const angle = ((i + 1) * 37 + (j + 1) * 19) * Math.PI / 180;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }
        const correction = Math.min(0.34, (minDistance - distance) * 0.18);
        const ux = dx / distance;
        const uy = dy / distance;
        a.pos.x = clamp(a.pos.x - (ux * correction * 0.5) / 0.82, 2, 98);
        a.pos.y = clamp(a.pos.y - uy * correction * 0.5, 2, 98);
        b.pos.x = clamp(b.pos.x + (ux * correction * 0.5) / 0.82, 2, 98);
        b.pos.y = clamp(b.pos.y + uy * correction * 0.5, 2, 98);
      }
    }
    for (const actor of actors) this.positionActor(actor);
  }

  private positionActor(actor: Actor) {
    const screen = this.toScreen(actor.pos);
    actor.container.setPosition(screen.x, screen.y);
    actor.container.setDepth(20 + screen.y);
    // Scale is set at spawn/resize, not on every physics tick; otherwise this
    // assignment overwrites pop/dive/celebration tweens and adds needless work.
  }

  private updateActorDepths() {
    for (const actor of [...this.homePlayers, ...this.awayPlayers]) {
      if (!actor.container.active) continue;
      const screenY = this.toScreen(actor.pos).y;
      actor.container.setDepth(20 + screenY);
    }
    this.ballShadow.setDepth(15 + this.toScreen(this.ballPos).y);
    this.ball.setDepth(40 + this.toScreen(this.ballPos).y + (this.ballMotion ? 10 : 0));
  }

  private processEventQueue() {
    if (this.ballMotion || !this.eventQueue.length || this.gameTime < this.nextEventAt) return;
    const event = this.eventQueue.shift();
    if (!event) return;
    const kind = upper(event.event_type);
    const side = this.sideForEvent(event);
    if (kind === 'GOAL' && this.lastGoalSide === side && this.gameTime - this.lastGoalAt < 2.5) {
      // Some server phases record both SHOT(result=GOAL) and GOAL. The shot
      // already drives the ball/celebration; keep the second record as a toast.
      this.showToast(`${Number(event.minute || 0)}′  ГОЛ`, side, 1.2);
      this.nextEventAt = this.gameTime + 0.18;
      return;
    }
    this.playEvent(event);
    this.nextEventAt = this.gameTime + 0.18;
  }

  private playEvent(event: VisualEvent) {
    const kind = upper(event.event_type);
    const side = this.sideForEvent(event);
    const metadata = this.readMetadata(event.metadata);
    const start = this.readPoint(metadata.start) ?? this.ballPos;
    let end = this.readPoint(metadata.end);
    if (kind === 'INTERCEPTION' && !end) end = this.nudgePoint(start, side === 'HOME' ? -1 : 1, 3.2, 2.5);
    const outcome = upper(metadata.result ?? metadata.outcome ?? '');
    const actor = this.resolveActor(side, finite(event.player_id), start);
    const opponentSide: Side = side === 'HOME' ? 'AWAY' : 'HOME';
    const secondarySide = ['TACKLE', 'PRESSURE', 'FOUL', 'OFFSIDE', 'INTERCEPTION'].includes(kind) ? opponentSide : side;
    const secondary = this.resolveActor(secondarySide, finite(event.secondary_player_id), end ?? this.ballPos, actor);
    // Interception metadata stores the interceptor in `start` and the player
    // whose pass is cut out in `end`; the ball therefore travels end -> start.
    const ballStart = kind === 'INTERCEPTION' && end ? end : start;
    const ballEnd = kind === 'INTERCEPTION' && end ? start : end;

    // Event coordinates are snapshots from a sparse match log. Move the ball
    // continuously from the previous live location to the event's start point
    // before playing the action; never teleport it across the pitch when a new
    // server event arrives. The queued event is replayed after this connector.
    const gapToStart = Math.hypot(ballStart.x - this.ballPos.x, ballStart.y - this.ballPos.y);
    if (this.isPitchAction(event) && gapToStart > 7) {
      if (actor) this.moveActorToward(actor, start, clamp(220 + gapToStart * 5, 260, 650), 0.45);
      this.settlingEvent = event;
      this.beginBallFlight(this.ballPos, ballStart, clamp(180 + gapToStart * 8, 220, 620), 2.2, 'SETTLE', '', side);
      return;
    }
    this.updateEventBadge(event);

    if (kind === 'GOAL' || (kind === 'SHOT' && outcome === 'GOAL')) {
      if (!end) end = { x: clamp(start.x + 0, 18, 82), y: side === 'HOME' ? 100 : 0 };
      else if (kind === 'SHOT' && (end.x <= 2 || end.x >= 98)) {
        // Older backend event metadata encoded the goal direction on the X
        // axis even though pitch positions use Y as depth. Translate that legacy
        // shot target into the correct end of the vertical pitch.
        end = { x: clamp(end.y, 18, 82), y: side === 'HOME' ? 100 : 0 };
      }
      if (actor) this.moveActorToward(actor, start, 260, 1.1);
      this.possessionSide = side;
      this.carrier = actor;
      this.pendingGoalSide = side;
      this.pendingGoalOutcome = outcome;
      this.beginBallFlight(start, end, clamp(590 + Math.hypot(end.x - start.x, end.y - start.y) * 2.4, 650, 900), 21, 'SHOT', outcome || 'GOAL', side);
      return;
    }

    if (kind === 'SHOT' || kind.includes('SAVE')) {
      this.homeShots += side === 'HOME' ? 1 : 0;
      this.awayShots += side === 'AWAY' ? 1 : 0;
      if (!end) end = { x: 50, y: side === 'HOME' ? 100 : 0 };
      if (end.x <= 2 || end.x >= 98) end = { x: clamp(end.y, 18, 82), y: side === 'HOME' ? 100 : 0 };
      // Legacy shot metadata stores a goal-line endpoint even for a block/wide.
      // Turn those outcomes into visible trajectories instead of flying every
      // non-goal shot straight into the goal mouth.
      if (outcome === 'BLOCKED') {
        end = { x: start.x + (end.x - start.x) * 0.58, y: start.y + (end.y - start.y) * 0.58 };
      } else if (outcome === 'WIDE') {
        const missSide = Number(event.id || 0) % 2 === 0 ? -1 : 1;
        end = { x: clamp(end.x + missSide * 17, 4, 96), y: end.y };
      }
      if (actor) this.moveActorToward(actor, start, 260, 1.8);
      this.showToast(outcome === 'SAVED' ? 'УДАР! ВРАТАРЬ СПАСАЕТ' : outcome === 'BLOCKED' ? 'УДАР ЗАБЛОКИРОВАН' : 'УДАР ПО ВОРОТАМ', side);
      this.possessionSide = side;
      this.carrier = actor;
      if (outcome === 'SAVED') {
        const keepers = opponentSide === 'HOME' ? this.homePlayers : this.awayPlayers;
        const keeper = keepers.find((candidate) => candidate.keeper) ?? this.nearestActor(opponentSide, end);
        if (keeper) {
          this.moveActorToward(keeper, end, 280, 0.1);
          this.popActor(keeper, 1.12);
        }
      } else if (outcome === 'BLOCKED') {
        const defenders = (opponentSide === 'HOME' ? this.homePlayers : this.awayPlayers).filter((candidate) => !candidate.keeper);
        let blocker: Actor | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const candidate of defenders) {
          const distance = Math.hypot(candidate.pos.x - start.x, candidate.pos.y - start.y);
          if (distance < bestDistance) { bestDistance = distance; blocker = candidate; }
        }
        if (blocker) {
          this.moveActorToward(blocker, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }, 300, 0.15);
          this.popActor(blocker, 1.08);
        }
      }
      this.beginBallFlight(start, end, clamp(540 + Math.hypot(end.x - start.x, end.y - start.y) * 2.3, 600, 860), 24, 'SHOT', outcome, side);
      return;
    }

    if (kind === 'PASS' || kind === 'CROSS' || kind === 'INTERCEPTION') {
      const passEnd = end ?? this.nudgePoint(start, side === 'HOME' ? 1 : -1, 9, (Number(event.id || 0) % 2 ? 6 : -6));
      const passBallStart = kind === 'INTERCEPTION' ? passEnd : start;
      const passBallEnd = kind === 'INTERCEPTION' ? start : passEnd;
      if (actor) {
        this.moveActorToward(actor, start, 220, 1.0);
        if (kind === 'INTERCEPTION') this.popActor(actor, 1.13);
      }
      const travelDistance = Math.hypot(passBallEnd.x - passBallStart.x, passBallEnd.y - passBallStart.y);
      if (secondary && (kind === 'PASS' || kind === 'CROSS')) this.moveActorToward(secondary, passEnd, clamp(360 + travelDistance * 12, 520, 1050), 0.35);
      this.possessionSide = side;
      this.carrier = (kind === 'INTERCEPTION' ? actor : secondary) ?? this.nearestActor(side, passBallEnd, actor);
      const flightDuration = kind === 'CROSS'
        ? clamp(620 + travelDistance * 13, 760, 1380)
        : clamp(350 + travelDistance * 13, 500, 1080);
      this.beginBallFlight(passBallStart, passBallEnd, flightDuration, kind === 'CROSS' ? 13 : 6.5, kind, outcome, side);
      return;
    }

    if (kind === 'CARRY' || kind === 'DRIBBLE') {
      if (!end) end = this.nudgePoint(start, side === 'HOME' ? 1 : -1, 7.5, (Number(event.id || 0) % 2 ? 4 : -4));
      const carryDistance = Math.hypot(end.x - start.x, end.y - start.y);
      if (actor) {
        this.carrier = actor;
        this.possessionSide = side;
        this.moveActorToward(actor, end, clamp(330 + carryDistance * 16, 430, 820), 0.45);
      }
      this.beginBallFlight(start, end, clamp(330 + carryDistance * 15, 430, 800), 2.8, 'CARRY', outcome, side);
      return;
    }

    if (kind === 'TACKLE' || kind === 'PRESSURE' || kind === 'FOUL' || kind === 'OFFSIDE') {
      if (actor) {
        this.moveActorToward(actor, start, 300, 1.2);
        this.popActor(actor, kind === 'TACKLE' ? 1.18 : 1.08);
      }
      if (kind === 'TACKLE') {
        this.possessionSide = side;
        this.carrier = actor ?? this.nearestActor(side, start);
      }
      const label = kind === 'FOUL' ? 'НАРУШЕНИЕ' : kind === 'OFFSIDE' ? 'ОФСАЙД' : kind === 'TACKLE' ? 'ОТБОР МЯЧА' : 'ПРЕССИНГ';
      this.showToast(label, side);
      if (end && kind !== 'FOUL') this.moveActorToward(secondary ?? actor, end, 280, 0.7);
      return;
    }

    if (kind === 'CORNER' || kind === 'THROW_IN' || kind === 'GOAL_KICK' || kind === 'FREE_KICK' || kind === 'PENALTY') {
      const setPiecePoint = kind === 'CORNER'
        ? { x: side === 'HOME' ? 3 : 97, y: side === 'HOME' ? 96 : 4 }
        : (end ?? start);
      this.possessionSide = side;
      this.carrier = actor;
      if (actor) this.moveActorToward(actor, setPiecePoint, 330, 1.5);
      this.beginBallFlight(this.ballPos, setPiecePoint, 320, 0, 'SET_PIECE', kind, side);
      this.showToast(kind === 'CORNER' ? 'УГЛОВОЙ' : kind === 'PENALTY' ? 'ПЕНАЛЬТИ' : kind === 'FREE_KICK' ? 'ШТРАФНОЙ' : 'СТАНДАРТ', side);
      return;
    }

    if (kind === 'YELLOW' || kind === 'YELLOW_CARD' || kind === 'RED' || kind === 'RED_CARD' || kind === 'CARD') {
      if (actor) {
        this.popActor(actor, 1.16);
        const red = kind.includes('RED');
        const card = this.add.rectangle(0, -27, 9, 13, red ? 0xff304f : 0xffdc47).setStrokeStyle(0.8, 0xffffff, 0.9);
        actor.container.add(card);
        this.tweens.add({ targets: card, y: -36, alpha: 0, duration: 1000, ease: 'Sine.easeOut', onComplete: () => card.destroy() });
      }
      this.showToast(kind.includes('RED') ? 'КРАСНАЯ КАРТОЧКА' : 'ЖЁЛТАЯ КАРТОЧКА', side);
      return;
    }

    if (kind === 'SUBSTITUTION') {
      this.showToast('ЗАМЕНА', side);
      return;
    }

    if (kind === 'INJURY') {
      this.showToast('ПАУЗА · ТРАВМА', side);
      return;
    }

    if (kind === 'ASSIST' || kind === 'WEATHER' || kind === 'TACTICAL_CHANGE' || kind === 'MOMENT_OF_BRILLIANCE') {
      if (kind === 'MOMENT_OF_BRILLIANCE') this.showToast('ОПАСНЫЙ МОМЕНТ', side);
      return;
    }

    if (actor && end) this.moveActorToward(actor, end, 340, 0.8);
  }

  private beginBallFlight(from: Vec, to: Vec, durationMs: number, arc: number, kind: string, outcome: string, side: Side | null) {
    const start = { x: clamp(from.x, 2, 98), y: clamp(from.y, 2, 98) };
    const end = { x: clamp(to.x, 2, 98), y: clamp(to.y, 2, 98) };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const bend = clamp(dx * 0.12 + (side === 'HOME' ? 2 : -2), -9, 9);
    this.ballMotion = {
      from: start,
      control: { x: clamp((start.x + end.x) / 2 + bend, 2, 98), y: clamp((start.y + end.y) / 2 - Math.sign(dy || 1) * Math.min(7, Math.abs(dy) * 0.07), 2, 98) },
      to: end,
      elapsed: 0,
      duration: Math.max(180, durationMs) / 1000,
      arc,
      kind,
      outcome,
      side,
    };
    this.ballPos = { ...start };
    this.setBallPosition(start, 0);
    if (kind === 'SHOT' || kind === 'PASS' || kind === 'CROSS') this.spawnKickBurst(start, side);
  }

  private spawnKickBurst(point: Vec, side: Side | null) {
    const screen = this.toScreen(point);
    const tint = side === 'AWAY' ? 0xff7d91 : 0x85e7ff;
    for (let i = 0; i < 5; i += 1) {
      const angle = (Math.PI * 2 * i) / 5 + this.gameTime * 1.7;
      const radius = 2 + (i % 2) * 1.5;
      const particle = this.add.circle(screen.x, screen.y, radius, tint, 0.78).setDepth(35 + screen.y);
      this.tweens.add({
        targets: particle,
        x: screen.x + Math.cos(angle) * (7 + i * 1.5),
        y: screen.y + Math.sin(angle) * (5 + i),
        alpha: 0,
        scale: 0.15,
        duration: 230 + i * 24,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private advanceBall(delta: number) {
    const motion = this.ballMotion;
    if (!motion) return;
    motion.elapsed += delta;
    const raw = clamp(motion.elapsed / motion.duration, 0, 1);
    const t = motion.kind === 'SHOT' ? 1 - Math.pow(1 - raw, 1.5) : raw * raw * (3 - 2 * raw);
    const oneMinus = 1 - t;
    const x = oneMinus * oneMinus * motion.from.x + 2 * oneMinus * t * motion.control.x + t * t * motion.to.x;
    const y = oneMinus * oneMinus * motion.from.y + 2 * oneMinus * t * motion.control.y + t * t * motion.to.y;
    const height = Math.sin(Math.PI * t) * motion.arc;
    this.ballPos = { x: clamp(x, 1, 99), y: clamp(y, 1, 99) };
    this.setBallPosition(this.ballPos, height);
    this.ball.rotation += delta * (motion.kind === 'SHOT' ? 12 : 7);
    if (raw >= 1) {
      const result = motion.outcome;
      const side = motion.side;
      const kind = motion.kind;
      this.ballMotion = null;
      this.ballPos = { ...motion.to };
      this.setBallPosition(this.ballPos, 0);
      if (kind === 'SETTLE') {
        const pending = this.settlingEvent;
        this.settlingEvent = null;
        if (pending) this.eventQueue.unshift(pending);
        this.nextEventAt = this.gameTime;
        return;
      }
      if (kind === 'SHOT') {
        if (result === 'GOAL' || this.pendingGoalSide) {
          this.triggerGoal(side ?? this.pendingGoalSide ?? 'HOME');
          this.possessionSide = side ?? this.pendingGoalSide;
          this.carrier = null;
        } else if (result === 'SAVED') {
          this.possessionSide = side === 'HOME' ? 'AWAY' : 'HOME';
          const defenders = this.possessionSide === 'HOME' ? this.homePlayers : this.awayPlayers;
          this.carrier = defenders.find((candidate) => candidate.keeper) ?? this.nearestActor(this.possessionSide, this.ballPos);
          if (this.carrier) this.moveActorToward(this.carrier, this.ballPos, 260, 0.25);
        } else if (result === 'BLOCKED') {
          this.possessionSide = side === 'HOME' ? 'AWAY' : 'HOME';
          this.carrier = this.nearestActor(this.possessionSide, this.ballPos);
        } else {
          this.possessionSide = null;
          this.carrier = null;
        }
      } else if (kind === 'PASS' || kind === 'CROSS' || kind === 'CARRY') {
        if (this.carrier) {
          this.carrier.actionTarget = { ...motion.to };
          this.carrier.actionUntil = this.gameTime + 0.28;
        }
        this.possessionSide = side;
      }
      this.pendingGoalSide = null;
      this.pendingGoalOutcome = '';
    }
  }

  private setBallPosition(position: Vec, height: number) {
    const ground = this.toScreen(position);
    this.ballShadow.setPosition(ground.x, ground.y + 2).setScale(1 + height / 65, 1 + height / 100).setAlpha(0.42 - clamp(height / 80, 0, 0.26));
    this.ball.setPosition(ground.x, ground.y - height);
    this.ball.setScale(this.actorScale() * (1 + height / 100));
    this.ball.setDepth(40 + ground.y + height * 0.15);
  }

  private advanceTrail(delta: number) {
    const pos = { x: this.ball.x, y: this.ball.y };
    if (this.ballMotion && this.gameTime - this.trailCursor > 0.024) {
      this.trailCursor = this.gameTime;
      const item = this.trail[(Math.floor(this.gameTime * 45) % this.trail.length)] ?? this.trail[0];
      item.setPosition(pos.x, pos.y).setAlpha(0.3).setScale(1.1);
    }
    for (const item of this.trail) {
      item.setAlpha(Math.max(0, item.alpha - delta * 1.8));
      item.setScale(Math.max(0.35, item.scaleX - delta * 0.8));
    }
  }

  private moveActorToward(actor: Actor | null | undefined, point: Vec, durationMs: number, offset: number) {
    if (!actor || !actor.container.active) return;
    const target = {
      x: clamp(point.x + offset * 0.18, 2, 98),
      y: clamp(point.y + (actor.side === 'HOME' ? -offset : offset), 2, 98),
    };
    actor.actionTarget = target;
    actor.actionUntil = this.gameTime + Math.max(0.22, durationMs / 1000);
    // The fixed-step steering loop handles acceleration and braking. Setting a
    // velocity impulse makes event actors start moving immediately without a
    // positional teleport or a second competing tween.
    const dx = target.x - actor.pos.x;
    const dy = target.y - actor.pos.y;
    const distance = Math.hypot(dx, dy) || 1;
    const impulse = Math.min(7, distance * 0.8);
    actor.velocity.x += (dx / distance) * impulse;
    actor.velocity.y += (dy / distance) * impulse;
  }

  private popActor(actor: Actor | null | undefined, scale: number) {
    if (!actor) return;
    this.tweens.killTweensOf(actor.container);
    this.tweens.add({ targets: actor.container, scaleX: this.actorScale() * scale, scaleY: this.actorScale() * scale,
      duration: 140, yoyo: true, ease: 'Quad.easeOut', onComplete: () => actor.container.setScale(this.actorScale()) });
  }

  private triggerGoal(side: Side) {
    if (this.lastGoalSide === side && this.gameTime - this.lastGoalAt < 2.5) return;
    this.lastGoalSide = side;
    this.lastGoalAt = this.gameTime;
    this.celebrationUntil = this.gameTime + 2.6;
    this.cameras.main.shake(190, 0.0024, true);
    this.goalFlash.setAlpha(0.42).setFillStyle(side === 'HOME' ? 0x38c5ff : 0xff536d, 0.17);
    this.tweens.add({ targets: this.goalFlash, alpha: 0, duration: 520, ease: 'Sine.easeOut' });
    this.showToast('ГООООЛ!', side, 2.1);
    const scoringActors = side === 'HOME' ? this.homePlayers : this.awayPlayers;
    for (const actor of scoringActors) {
      if (actor.role === 'GK') continue;
      actor.velocity.x += (Math.random() - 0.5) * 7;
      actor.velocity.y += (side === 'HOME' ? 1 : -1) * (4 + Math.random() * 3);
      actor.ring.setVisible(actor === this.carrier);
    }
    for (let i = 0; i < 28; i += 1) {
      const star = this.add.circle(0, 0, Phaser.Math.Between(1, 3), side === 'HOME' ? 0x82eaff : 0xff8a9f, 1).setDepth(7000);
      const screen = this.toScreen(this.ballPos);
      star.setPosition(screen.x, screen.y);
      this.tweens.add({ targets: star, x: star.x + Phaser.Math.Between(-75, 75), y: star.y + Phaser.Math.Between(-85, 40),
        alpha: 0, scale: 0.2, duration: Phaser.Math.Between(500, 1050), ease: 'Quad.easeOut', onComplete: () => star.destroy() });
    }
    this.ball.setScale(this.actorScale() * 1.25);
    this.tweens.add({ targets: this.ball, scaleX: this.actorScale(), scaleY: this.actorScale(), duration: 360, ease: 'Back.easeOut' });
  }

  private showToast(message: string, side: Side | null, duration = 1.15) {
    const tint = side === 'AWAY' ? 0xff6b82 : side === 'HOME' ? 0x58caff : 0x75e8c3;
    this.eventBadgeText.setText(message);
    this.eventBadgeText.setColor('#ffffff');
    const bg = this.eventBadge.getData('background') as Phaser.GameObjects.Rectangle;
    if (bg) {
      const width = Math.max(92, this.eventBadgeText.width + 22);
      bg.setSize(width, this.eventBadgeText.height + 12).setFillStyle(0x061a2b, 0.88).setStrokeStyle(1, tint, 0.8);
    }
    this.eventBadge.setPosition(this.scale.width / 2, this.fieldRect.y + 21).setAlpha(0).setVisible(true).setScale(0.92);
    this.tweens.killTweensOf(this.eventBadge);
    this.tweens.add({ targets: this.eventBadge, alpha: 1, scale: 1, duration: 150, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.eventBadge, alpha: 0, y: this.fieldRect.y + 8, delay: duration * 1000, duration: 250,
      ease: 'Sine.easeIn', onComplete: () => this.eventBadge.setVisible(false) });
  }

  private updateEventBadge(event: VisualEvent) {
    const kind = upper(event.event_type);
    const minute = Number(event.minute || 0);
    const labels: Record<string, string> = {
      PASS: 'ПЕРЕДАЧА', CROSS: 'ПРОСТРЕЛ', SHOT: 'УДАР', GOAL: 'ГОЛ', CARRY: 'ДРИБЛИНГ',
      TACKLE: 'ОТБОР', INTERCEPTION: 'ПЕРЕХВАТ', PRESSURE: 'ПРЕССИНГ', FOUL: 'ФОЛ', CORNER: 'УГЛОВОЙ',
      YELLOW: 'ЖЁЛТАЯ КАРТОЧКА', RED: 'КРАСНАЯ КАРТОЧКА', SUBSTITUTION: 'ЗАМЕНА', OFFSIDE: 'ОФСАЙД',
      SAVED: 'СЕЙВ ВРАТАРЯ', PENALTY: 'ПЕНАЛЬТИ',
    };
    const side = this.sideForEvent(event);
    this.showToast(`${minute}′  ${labels[kind] ?? kind}`, side, kind === 'GOAL' ? 1.7 : 0.85);
  }

  private restoreLatestState(events: VisualEvent[]) {
    const latest = [...events].reverse().find((event) => this.isPitchAction(event));
    if (!latest) return;
    const kind = upper(latest.event_type);
    const side = this.sideForEvent(latest);
    const metadata = this.readMetadata(latest.metadata);
    const start = this.readPoint(metadata.start);
    let end = this.readPoint(metadata.end);
    if (kind === 'SHOT' && end && (end.x <= 2 || end.x >= 98)) end = { x: clamp(end.y, 18, 82), y: side === 'HOME' ? 98 : 2 };
    const restore = end ?? start;
    if (restore) this.setBallPosition(restore, 0);
    if (restore) this.ballPos = { ...restore };
    this.possessionSide = ['SHOT', 'GOAL', 'FOUL', 'CORNER', 'PASS', 'CROSS', 'CARRY', 'INTERCEPTION', 'TACKLE'].includes(kind) ? side : null;
    const receiverId = (kind === 'PASS' || kind === 'CROSS') ? finite(latest.secondary_player_id) : finite(latest.player_id);
    this.carrier = receiverId !== null ? this.playerActors.get(receiverId) ?? null : null;
    if (!this.carrier && restore && this.possessionSide) this.carrier = this.nearestActor(this.possessionSide, restore);
    if (this.carrier) this.carrier.nameText.setText(this.carrier.playerName);
  }

  private isPitchAction(event: MatchEvent) {
    const kind = upper(event.event_type);
    return ['PASS', 'CROSS', 'CARRY', 'DRIBBLE', 'SHOT', 'GOAL', 'SAVE', 'SAVED', 'CORNER', 'FOUL', 'TACKLE', 'PRESSURE', 'INTERCEPTION', 'YELLOW', 'RED', 'SUBSTITUTION', 'OFFSIDE', 'PENALTY', 'FREE_KICK', 'THROW_IN', 'GOAL_KICK'].includes(kind);
  }

  private resolveActor(side: Side, playerId: number | null, point: EventPoint, exclude?: Actor | null) {
    if (playerId && this.playerActors.has(playerId)) {
      const linked = this.playerActors.get(playerId)!;
      if (linked.side === side && linked.container.active) return linked;
    }
    // A missing/substituted player ID may not be in the active XI. Use spatial
    // proximity for this one event, but never hijack another actor's identity.
    return this.nearestActor(side, point ?? this.ballPos, exclude ?? null);
  }

  private nearestActor(side: Side | null, point: Vec, exclude?: Actor | null) {
    const actors = (side === 'AWAY' ? this.awayPlayers : side === 'HOME' ? this.homePlayers : [...this.homePlayers, ...this.awayPlayers])
      .filter((actor) => actor.container.active && !actor.retiring && actor !== exclude);
    let best: Actor | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const actor of actors) {
      const dx = (actor.pos.x - point.x) * 0.82;
      const dy = actor.pos.y - point.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = actor;
      }
    }
    return best;
  }

  private sideForEvent(event: MatchEvent): Side {
    const clubId = finite(event.club_id);
    if (clubId !== null && this.awayClubId !== null && clubId === this.awayClubId) return 'AWAY';
    if (clubId !== null && this.homeClubId !== null && clubId === this.homeClubId) return 'HOME';
    return 'HOME';
  }

  private readMetadata(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      } catch { /* stale or malformed event metadata should not break the scene */ }
    }
    return {};
  }

  private readPoint(value: unknown): Vec | null {
    let x: number | null = null;
    let y: number | null = null;
    if (Array.isArray(value) && value.length >= 2) {
      x = finite(value[0]); y = finite(value[1]);
    } else if (value && typeof value === 'object') {
      const row = value as Record<string, unknown>;
      x = finite(row.x ?? row.targetX); y = finite(row.y ?? row.targetY);
    }
    if (x === null || y === null) return null;
    // Event metadata is stored in percentage-based field coordinates.
    return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
  }

  private nudgePoint(start: Vec, direction: number, forward: number, lateral: number) {
    return { x: clamp(start.x + lateral, 3, 97), y: clamp(start.y + direction * forward, 3, 97) };
  }

  private getEventKey(event: MatchEvent) {
    const id = Number(event.id || 0);
    if (Number.isFinite(id) && id > 0) return `id:${id}`;
    return `${event.minute}|${event.event_type}|${event.club_id ?? 0}|${event.player_id ?? 0}|${event.description}`;
  }

  private trimProcessedEvents() {
    if (this.processedEvents.size <= 1800) return;
    const values = [...this.processedEvents];
    this.processedEvents = new Set(values.slice(-1100));
  }

  private toScreen(point: Vec): Vec {
    const rect = this.fieldRect;
    return {
      x: rect.x + (clamp(point.x, 0, 100) / 100) * rect.width,
      y: rect.y + (clamp(point.y, 0, 100) / 100) * rect.height,
    };
  }

  private fromScreen(point: Vec): Vec {
    const rect = this.fieldRect;
    return { x: clamp(((point.x - rect.x) / rect.width) * 100, 0, 100), y: clamp(((point.y - rect.y) / rect.height) * 100, 0, 100) };
  }

  private drawPitch() {
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    const mx = Math.max(15, width * 0.055);
    const my = Math.max(12, height * 0.025);
    this.fieldRect = { x: mx, y: my, width: width - mx * 2, height: height - my * 2 };
    this.fieldGraphics?.destroy();
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x041a20, 1); g.fillRect(0, 0, width, height);
    // Dark stadium apron and thin floodlight glow around the playing surface.
    g.fillStyle(0x0a2931, 1); g.fillRoundedRect(mx - 5, my - 5, width - (mx - 5) * 2, height - (my - 5) * 2, 12);
    const { x, y, width: pw, height: ph } = this.fieldRect;
    g.fillStyle(0x11764f, 1); g.fillRoundedRect(x, y, pw, ph, 6);
    const stripeCount = 12;
    const stripeH = ph / stripeCount;
    for (let i = 0; i < stripeCount; i += 1) {
      if (i % 2 === 0) g.fillStyle(0xffffff, 0.035);
      else g.fillStyle(0x001d13, 0.045);
      g.fillRect(x + 1, y + i * stripeH, pw - 2, stripeH + 0.4);
    }
    // Subtle touchline glow and the complete vertical pitch marking set.
    g.lineStyle(1.45, 0xe5fff2, 0.78);
    g.strokeRoundedRect(x + 5, y + 5, pw - 10, ph - 10, 3);
    g.lineBetween(x + 5, y + ph / 2, x + pw - 5, y + ph / 2);
    g.strokeCircle(x + pw / 2, y + ph / 2, Math.min(pw * 0.165, ph * 0.078));
    g.fillStyle(0xeafff7, 0.8); g.fillCircle(x + pw / 2, y + ph / 2, 1.7);
    // Penalty areas and six-yard boxes at both ends.
    const penaltyW = pw * 0.58, boxW = pw * 0.31;
    const penaltyH = ph * 0.135, boxH = ph * 0.048;
    const sideInset = (pw - penaltyW) / 2;
    const smallInset = (pw - boxW) / 2;
    g.lineStyle(1.4, 0xe5fff2, 0.78);
    g.strokeRect(x + sideInset, y + 5, penaltyW, penaltyH);
    g.strokeRect(x + sideInset, y + ph - 5 - penaltyH, penaltyW, penaltyH);
    g.strokeRect(x + smallInset, y + 5, boxW, boxH);
    g.strokeRect(x + smallInset, y + ph - 5 - boxH, boxW, boxH);
    const spotYTop = y + penaltyH * 0.69;
    const spotYBottom = y + ph - penaltyH * 0.69;
    g.fillStyle(0xeafff7, 0.8);
    g.fillCircle(x + pw / 2, spotYTop, 1.4); g.fillCircle(x + pw / 2, spotYBottom, 1.4);
    g.lineStyle(1.1, 0xe5fff2, 0.72);
    g.beginPath(); g.arc(x + pw / 2, spotYTop + ph * 0.012, pw * 0.115, 0.18 * Math.PI, 0.82 * Math.PI, false); g.strokePath();
    g.beginPath(); g.arc(x + pw / 2, spotYBottom - ph * 0.012, pw * 0.115, 1.18 * Math.PI, 1.82 * Math.PI, false); g.strokePath();
    // Goals and net grid.
    const goalW = pw * 0.25, goalDepth = Math.max(5, ph * 0.012);
    const goalX = x + (pw - goalW) / 2;
    g.fillStyle(0xd9fff2, 0.08); g.fillRect(goalX, y - goalDepth, goalW, goalDepth + 2); g.fillRect(goalX, y + ph - 2, goalW, goalDepth + 2);
    g.lineStyle(1.6, 0xffffff, 0.85);
    g.strokeRect(goalX, y - goalDepth, goalW, goalDepth); g.strokeRect(goalX, y + ph, goalW, goalDepth);
    g.lineStyle(0.5, 0xe8fff6, 0.18);
    for (let i = 1; i < 5; i += 1) {
      const gx = goalX + (goalW / 5) * i;
      g.lineBetween(gx, y - goalDepth, gx, y); g.lineBetween(gx, y + ph, gx, y + ph + goalDepth);
    }
    for (let i = 1; i < 3; i += 1) {
      const gy = y - goalDepth + (goalDepth / 3) * i;
      g.lineBetween(goalX, gy, goalX + goalW, gy);
      const gy2 = y + ph + (goalDepth / 3) * i;
      g.lineBetween(goalX, gy2, goalX + goalW, gy2);
    }
    // Small corner arcs.
    g.lineStyle(1, 0xe5fff2, 0.64);
    const r = Math.min(7, pw * 0.025);
    g.beginPath(); g.arc(x + 5, y + 5, r, 0, Math.PI / 2, false); g.strokePath();
    g.beginPath(); g.arc(x + pw - 5, y + 5, r, Math.PI / 2, Math.PI, false); g.strokePath();
    g.beginPath(); g.arc(x + 5, y + ph - 5, r, -Math.PI / 2, 0, false); g.strokePath();
    g.beginPath(); g.arc(x + pw - 5, y + ph - 5, r, Math.PI, Math.PI * 1.5, false); g.strokePath();
    // Subtle field side lighting adds depth without expensive post-processing.
    g.fillStyle(0x6bffd6, 0.045); g.fillRect(x, y, 3, ph); g.fillStyle(0x00191a, 0.11); g.fillRect(x + pw - 3, y, 3, ph);
    this.fieldGraphics = g;
    this.positionHud();
  }

  private positionHud() {
    if (!this.possessionBadge || !this.eventBadge) return;
    const width = this.scale.width || 360;
    this.possessionBadge.setPosition(width / 2, this.scale.height - 15);
    this.eventBadge.setPosition(width / 2, this.fieldRect.y + 21);
    if (this.goalFlash) this.goalFlash.setSize(width, this.scale.height);
  }

  private handleResize() {
    const width = this.scale.width;
    const height = this.scale.height;
    if (width <= 0 || height <= 0) return;
    this.lastWidth = width;
    this.lastHeight = height;
    this.drawPitch();
    const scale = this.actorScale();
    for (const actor of [...this.homePlayers, ...this.awayPlayers]) {
      actor.container.setScale(scale);
      this.positionActor(actor);
    }
    this.setBallPosition(this.ballPos, 0);
    this.positionHud();
  }

  private updateEffects(delta: number) {
    const homePct = clamp(this.homePossession, 0, 100);
    this.possessionText.setText(`ВЛАДЕНИЕ  ·  ${Math.round(homePct)}% / ${100 - Math.round(homePct)}%`);
    this.possessionBackground.setSize(Math.min((this.scale.width || 360) - 20, this.possessionText.width + 20), 22);
    if (this.possessionSide === 'AWAY') this.possessionText.setColor('#ff9cae');
    else if (this.possessionSide === 'HOME') this.possessionText.setColor('#8de2ff');
    else this.possessionText.setColor('#ecfffb');
    if (this.celebrationUntil > this.gameTime) {
      this.possessionBadge.setAlpha(0.45);
    } else {
      this.possessionBadge.setAlpha(1);
    }
    // Keep the scene visually alive even between sparse server events: player
    // shape and ball continue their own animation, while score/statistics stay
    // authoritative in React/API.
    if (!this.ballMotion && this.carrier && this.possessionSide) {
      const screen = this.toScreen(this.ballPos);
      this.ball.rotation += delta * 1.25;
      this.ball.setPosition(screen.x, screen.y - 0.2);
    }
  }
}
