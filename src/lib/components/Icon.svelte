<script lang="ts">
	import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon';
	import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon';
	import ArrowUpRightIcon from 'phosphor-svelte/lib/ArrowUpRightIcon';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import CaretUpIcon from 'phosphor-svelte/lib/CaretUpIcon';
	import ChartLineIcon from 'phosphor-svelte/lib/ChartLineIcon';
	import ChartLineUpIcon from 'phosphor-svelte/lib/ChartLineUpIcon';
	import ClipboardTextIcon from 'phosphor-svelte/lib/ClipboardTextIcon';
	import ClockCounterClockwiseIcon from 'phosphor-svelte/lib/ClockCounterClockwiseIcon';
	import CloudIcon from 'phosphor-svelte/lib/CloudIcon';
	import CloudArrowUpIcon from 'phosphor-svelte/lib/CloudArrowUpIcon';
	import CodeIcon from 'phosphor-svelte/lib/CodeIcon';
	import CompassIcon from 'phosphor-svelte/lib/CompassIcon';
	import CrownIcon from 'phosphor-svelte/lib/CrownIcon';
	import DatabaseIcon from 'phosphor-svelte/lib/DatabaseIcon';
	import DesktopIcon from 'phosphor-svelte/lib/DesktopIcon';
	import DeviceMobileIcon from 'phosphor-svelte/lib/DeviceMobileIcon';
	import EyeIcon from 'phosphor-svelte/lib/EyeIcon';
	import EyeSlashIcon from 'phosphor-svelte/lib/EyeSlashIcon';
	import FlagIcon from 'phosphor-svelte/lib/FlagIcon';
	import FolderOpenIcon from 'phosphor-svelte/lib/FolderOpenIcon';
	import GearIcon from 'phosphor-svelte/lib/GearIcon';
	import GlobeIcon from 'phosphor-svelte/lib/GlobeIcon';
	import LeafIcon from 'phosphor-svelte/lib/LeafIcon';
	import ListIcon from 'phosphor-svelte/lib/ListIcon';
	import LockKeyIcon from 'phosphor-svelte/lib/LockKeyIcon';
	import MoonIcon from 'phosphor-svelte/lib/MoonIcon';
	import PawPrintIcon from 'phosphor-svelte/lib/PawPrintIcon';
	import PencilIcon from 'phosphor-svelte/lib/PencilIcon';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import SealCheckIcon from 'phosphor-svelte/lib/SealCheckIcon';
	import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon';
	import StorefrontIcon from 'phosphor-svelte/lib/StorefrontIcon';
	import SunIcon from 'phosphor-svelte/lib/SunIcon';
	import TagIcon from 'phosphor-svelte/lib/TagIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
	import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
	import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon';
	import UserPlusIcon from 'phosphor-svelte/lib/UserPlusIcon';
	import UsersIcon from 'phosphor-svelte/lib/UsersIcon';
	import WarningIcon from 'phosphor-svelte/lib/WarningIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import type { IconWeight } from 'phosphor-svelte';

	const icons = {
		'arrow-right': ArrowRightIcon,
		'arrow-square-out': ArrowSquareOutIcon,
		'arrow-up-right': ArrowUpRightIcon,
		'caret-down': CaretDownIcon,
		'caret-up': CaretUpIcon,
		'chart-line': ChartLineIcon,
		'chart-line-up': ChartLineUpIcon,
		'clipboard-text': ClipboardTextIcon,
		'clock-counter-clockwise': ClockCounterClockwiseIcon,
		cloud: CloudIcon,
		'cloud-arrow-up': CloudArrowUpIcon,
		code: CodeIcon,
		compass: CompassIcon,
		crown: CrownIcon,
		database: DatabaseIcon,
		desktop: DesktopIcon,
		'device-mobile': DeviceMobileIcon,
		eye: EyeIcon,
		'eye-slash': EyeSlashIcon,
		flag: FlagIcon,
		'folder-open': FolderOpenIcon,
		gear: GearIcon,
		globe: GlobeIcon,
		leaf: LeafIcon,
		list: ListIcon,
		'lock-key': LockKeyIcon,
		'paw-print': PawPrintIcon,
		pencil: PencilIcon,
		plus: PlusIcon,
		'seal-check': SealCheckIcon,
		sparkle: SparkleIcon,
		storefront: StorefrontIcon,
		tag: TagIcon,
		trash: TrashIcon,
		trophy: TrophyIcon,
		'user-circle': UserCircleIcon,
		'user-plus': UserPlusIcon,
		users: UsersIcon,
		warning: WarningIcon,
		sun: SunIcon,
		moon: MoonIcon,
		x: XIcon
	} as const;

	type IconName = keyof typeof icons;
	let {
		name,
		size = '1em',
		weight = 'regular',
		class: className = ''
	}: { name: IconName; size?: number | string; weight?: IconWeight; class?: string } = $props();
	let Glyph = $derived(icons[name]);
</script>

<Glyph {size} {weight} class="app-icon {className}" aria-hidden="true" focusable="false" />
