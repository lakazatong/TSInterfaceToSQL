interface Statistics {
	count_100: number;
	count_300: number;
	count_50: number;
	count_miss: number;
	global_rank: null | number;
	global_rank_exp: null | number;
	grade_counts: { a: number; s: number; sh: number; ss: number; ssh: number };
	hit_accuracy: number;
	is_ranked: boolean;
	level: { current: number; progress: number };
	maximum_combo: number;
	play_count: number;
	play_time: null | number;
	pp: null | number;
	pp_exp: null | number;
	ranked_score: number;
	replays_watched_by_others: number;
	total_hits: number;
	total_score: number;
}
