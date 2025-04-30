interface User {
    avatar_url: string;
    country: { code: string; name: string };
    country_code: string;
    cover: { custom_url: null | string; id: null | number; url: string };
    default_group: string;
    groups: {
        colour: null | string;
        has_listing: boolean;
        has_playmodes: boolean;
        id: number;
        identifier: string;
        is_probationary: boolean;
        name: string;
        playmodes: null | ("osu" | "taiko" | "fruits" | "mania")[];
        short_name: string;
    }[];
    id: number;
    is_active: boolean;
    is_bot: boolean;
    is_deleted: boolean;
    is_online: boolean;
    is_supporter: boolean;
    last_visit: null
    | Date;
    pm_friends_only: boolean;
    profile_colour: null | string;
    statistics_rulesets: {
        fruits?: Statistics;
        mania?: Statistics;
        osu?: Statistics;
        taiko?: Statistics;
    };
    team: | null
    | { flag_url: string; id: number; name: string; short_name: string };
    username: string;
    variants?: {
        country_rank: null | number;
        global_rank: null | number;
        mode: "osu" | "taiko" | "fruits" | "mania";
        pp: number;
        variant: string;
    }[];
}