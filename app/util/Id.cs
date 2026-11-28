namespace App.Util;

public static class Id {
    private static uint next = 1;

    public static uint Next() => next++;
    public static uint Peek() => next;
    public static void Reset(uint start = 1) => next = start;
}