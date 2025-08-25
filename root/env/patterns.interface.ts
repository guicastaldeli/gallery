export interface Patterns {
    patterns: {
        chamber: {
            base: {
                front: string[];
                back: string[];
                right: string[];
                left: string[];
                floor: string[];
                ceiling: string[];
            },
            fill: string[];
        }
        ceiling: string[];
        ground: string[];
    }
}